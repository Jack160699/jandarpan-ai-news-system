import { createAdminServerClient, isSupabaseConfigured } from "@/lib/supabase";
import { validateTransition } from "@/lib/editorial-workflow/engine";
import { buildWorkflowTransitionPatch } from "@/lib/editorial/publication";
import type {
  WorkflowArticleCard,
  WorkflowBoardSnapshot,
  WorkflowCommentRecord,
  WorkflowEventRecord,
  WorkflowStatus,
} from "@/lib/editorial-workflow/types";
import { WORKFLOW_STATUSES } from "@/lib/editorial-workflow/types";
import type { DashboardSession } from "@/lib/saas-auth/types";

function isOverdue(deadline: string | null, status: WorkflowStatus): boolean {
  if (!deadline || status === "published" || status === "archived" || status === "draft") {
    return false;
  }
  return new Date(deadline).getTime() < Date.now();
}

export async function fetchWorkflowBoard(
  tenantId: string
): Promise<WorkflowBoardSnapshot | null> {
  if (!isSupabaseConfigured()) return null;

  const supabase = createAdminServerClient();
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  const [articlesRes, eventsRes, membersRes] = await Promise.all([
    supabase
      .from("generated_articles")
      .select(
        "id, slug, headline, summary, workflow_status, workflow_deadline_at, workflow_assigned_to, workflow_rejection_reason, editorial_status, published_at, created_at, language, tenant_id"
      )
      .eq("tenant_id", tenantId)
      .neq("workflow_status", "archived")
      .order("workflow_deadline_at", { ascending: true, nullsFirst: false })
      .limit(200),
    supabase
      .from("editorial_workflow_events")
      .select(
        "id, article_id, event_type, from_status, to_status, comment, rejection_reason, actor_email, created_at, payload"
      )
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })
      .limit(40),
    supabase
      .from("tenant_memberships")
      .select("user_id, email")
      .eq("tenant_id", tenantId)
      .eq("status", "active")
      .order("email", { ascending: true }),
  ]);

  const articles = articlesRes.data ?? [];
  const assigneeIds = [
    ...new Set(
      articles
        .map((a) => a.workflow_assigned_to)
        .filter((id): id is string => Boolean(id))
    ),
  ];

  const emailByUser = new Map<string, string>();
  if (assigneeIds.length) {
    const { data: memberships } = await supabase
      .from("tenant_memberships")
      .select("user_id, email")
      .in("user_id", assigneeIds);
    for (const m of memberships ?? []) {
      emailByUser.set(m.user_id, m.email);
    }
  }

  const cards: WorkflowArticleCard[] = articles.map((row) => {
    const status = (row.workflow_status ?? "draft") as WorkflowStatus;
    return {
      id: row.id,
      slug: row.slug,
      headline: row.headline,
      summary: row.summary,
      workflow_status: status,
      workflow_deadline_at: row.workflow_deadline_at,
      workflow_assigned_to: row.workflow_assigned_to,
      workflow_rejection_reason: row.workflow_rejection_reason,
      editorial_status: row.editorial_status ?? "pending",
      published_at: row.published_at,
      created_at: row.created_at,
      language: row.language,
      assignee_email: row.workflow_assigned_to
        ? emailByUser.get(row.workflow_assigned_to) ?? null
        : null,
      is_overdue: isOverdue(row.workflow_deadline_at, status),
    };
  });

  const columns = {} as Record<WorkflowStatus, WorkflowArticleCard[]>;
  for (const s of WORKFLOW_STATUSES) {
    columns[s] = cards.filter((c) => c.workflow_status === s);
  }

  const by_status = {} as Record<WorkflowStatus, number>;
  for (const s of WORKFLOW_STATUSES) {
    by_status[s] = columns[s].length;
  }

  const workloadMap = new Map<string, number>();
  for (const c of cards) {
    if (!c.assignee_email) continue;
    workloadMap.set(c.assignee_email, (workloadMap.get(c.assignee_email) ?? 0) + 1);
  }

  const publishedToday = cards.filter(
    (c) =>
      c.workflow_status === "published" &&
      c.published_at &&
      new Date(c.published_at) >= todayStart
  ).length;

  return {
    columns,
    analytics: {
      total: cards.length,
      pending_review: by_status.review + by_status.fact_check + by_status.legal_review,
      overdue: cards.filter((c) => c.is_overdue).length,
      published_today: publishedToday,
      by_status,
      workload: [...workloadMap.entries()]
        .map(([email, count]) => ({ email, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 8),
    },
    assignees: (membersRes.data ?? []).map((m) => ({
      user_id: m.user_id,
      email: m.email,
    })),
    events: (eventsRes.data ?? []) as WorkflowEventRecord[],
    fetchedAt: new Date().toISOString(),
  };
}

export async function transitionWorkflow(input: {
  session: DashboardSession;
  articleId: string;
  toStatus: WorkflowStatus;
  comment?: string;
  rejectionReason?: string;
  assignToUserId?: string | null;
}): Promise<{ ok: boolean; error?: string }> {
  if (!isSupabaseConfigured()) return { ok: false, error: "not_configured" };

  const supabase = createAdminServerClient();
  const tenantId = input.session.membership.tenantId;

  const { data: article, error: loadError } = await supabase
    .from("generated_articles")
    .select(
      "id, workflow_status, published_at, tenant_id"
    )
    .eq("id", input.articleId)
    .eq("tenant_id", tenantId)
    .maybeSingle();

  if (loadError || !article) {
    return { ok: false, error: "article_not_found" };
  }

  const fromStatus = (article.workflow_status ?? "draft") as WorkflowStatus;
  const check = validateTransition({
    role: input.session.membership.role,
    from: fromStatus,
    to: input.toStatus,
  });

  if (!check.ok) return { ok: false, error: check.error };

  const rejectionReason =
    input.toStatus === "draft" && input.rejectionReason
      ? input.rejectionReason.trim()
      : null;

  let publishedAt = article.published_at;
  if (input.toStatus === "published" && !publishedAt) {
    publishedAt = new Date().toISOString();
  }

  const patch = buildWorkflowTransitionPatch({
    toStatus: input.toStatus,
    publishedAt,
    rejectionReason,
    assignToUserId: input.assignToUserId,
  });

  const { error: updateError } = await supabase
    .from("generated_articles")
    .update(patch as never)
    .eq("id", input.articleId)
    .eq("tenant_id", tenantId);

  if (updateError) return { ok: false, error: updateError.message };

  await supabase.from("editorial_workflow_events").insert({
    tenant_id: tenantId,
    article_id: input.articleId,
    actor_user_id: input.session.userId,
    actor_email: input.session.email,
    event_type: rejectionReason ? "rejected" : "transition",
    from_status: fromStatus,
    to_status: input.toStatus,
    comment: input.comment ?? null,
    rejection_reason: rejectionReason,
    payload: {
      role: input.session.membership.role,
      notify: true,
    },
  });

  return { ok: true };
}

export async function assignWorkflowArticle(input: {
  session: DashboardSession;
  articleId: string;
  assignToUserId: string | null;
}): Promise<{ ok: boolean; error?: string }> {
  if (!isSupabaseConfigured()) return { ok: false, error: "not_configured" };

  const supabase = createAdminServerClient();
  const { error } = await supabase
    .from("generated_articles")
    .update({
      workflow_assigned_to: input.assignToUserId,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", input.articleId)
    .eq("tenant_id", input.session.membership.tenantId);

  if (error) return { ok: false, error: error.message };

  await supabase.from("editorial_workflow_events").insert({
    tenant_id: input.session.membership.tenantId,
    article_id: input.articleId,
    actor_user_id: input.session.userId,
    actor_email: input.session.email,
    event_type: "assigned",
    payload: { assignToUserId: input.assignToUserId },
  });

  return { ok: true };
}

export async function addWorkflowComment(input: {
  session: DashboardSession;
  articleId: string;
  body: string;
  workflowStatus?: string | null;
}): Promise<{ ok: boolean; error?: string; comment?: WorkflowCommentRecord }> {
  if (!isSupabaseConfigured()) return { ok: false, error: "not_configured" };

  const body = input.body.trim();
  if (!body) return { ok: false, error: "comment_required" };

  const supabase = createAdminServerClient();
  const { data, error } = await supabase
    .from("editorial_workflow_comments")
    .insert({
      tenant_id: input.session.membership.tenantId,
      article_id: input.articleId,
      author_user_id: input.session.userId,
      author_email: input.session.email,
      body,
      workflow_status: input.workflowStatus ?? null,
    })
    .select("id, article_id, author_email, body, workflow_status, created_at")
    .single();

  if (error || !data) return { ok: false, error: error?.message ?? "insert_failed" };

  await supabase.from("editorial_workflow_events").insert({
    tenant_id: input.session.membership.tenantId,
    article_id: input.articleId,
    actor_user_id: input.session.userId,
    actor_email: input.session.email,
    event_type: "comment",
    comment: body,
    payload: {},
  });

  return { ok: true, comment: data as WorkflowCommentRecord };
}

export async function fetchArticleWorkflowDetail(
  tenantId: string,
  articleId: string
): Promise<{
  events: WorkflowEventRecord[];
  comments: WorkflowCommentRecord[];
} | null> {
  if (!isSupabaseConfigured()) return null;

  const supabase = createAdminServerClient();
  const [eventsRes, commentsRes] = await Promise.all([
    supabase
      .from("editorial_workflow_events")
      .select(
        "id, article_id, event_type, from_status, to_status, comment, rejection_reason, actor_email, created_at, payload"
      )
      .eq("article_id", articleId)
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("editorial_workflow_comments")
      .select("id, article_id, author_email, body, workflow_status, created_at")
      .eq("article_id", articleId)
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })
      .limit(30),
  ]);

  return {
    events: (eventsRes.data ?? []) as WorkflowEventRecord[],
    comments: (commentsRes.data ?? []) as WorkflowCommentRecord[],
  };
}
