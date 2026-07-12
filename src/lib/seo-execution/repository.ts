/**
 * SEO Execution — Supabase persistence
 */

import { createAdminServerClient, isSupabaseConfigured } from "@/lib/supabase";
import type {
  ArticleAuditScores,
  ExecutionDashboard,
  ExecutionJob,
  ExecutionSuggestion,
  SuggestionDraft,
} from "@/lib/seo-execution/types";

type ExecTable =
  | "seo_execution_jobs"
  | "seo_execution_suggestions"
  | "seo_execution_history"
  | "seo_execution_feedback";

function fromExec(table: ExecTable) {
  return createAdminServerClient().from(table as never);
}

function mapSuggestion(row: Record<string, unknown>): ExecutionSuggestion {
  return {
    id: String(row.id),
    job_id: String(row.job_id),
    generated_article_id: String(row.generated_article_id),
    suggestion_type: row.suggestion_type as ExecutionSuggestion["suggestion_type"],
    field_key: String(row.field_key),
    current_value: (row.current_value as string | null) ?? null,
    suggested_value: String(row.suggested_value),
    reason: String(row.reason),
    expected_impact: String(row.expected_impact ?? ""),
    confidence: Number(row.confidence),
    priority: row.priority as ExecutionSuggestion["priority"],
    status: row.status as ExecutionSuggestion["status"],
    metadata: (row.metadata as Record<string, unknown>) ?? {},
    created_at: String(row.created_at),
  };
}

export async function createJob(input: {
  articleId: string;
  articleSlug: string;
  auditScores: ArticleAuditScores;
  triggeredBy?: string;
}): Promise<string> {
  const { data, error } = await fromExec("seo_execution_jobs")
    .insert({
      generated_article_id: input.articleId,
      article_slug: input.articleSlug,
      status: "running",
      audit_scores: input.auditScores,
      overall_score: input.auditScores.overallScore,
      triggered_by: input.triggeredBy ?? null,
      started_at: new Date().toISOString(),
    } as never)
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  return String((data as { id: string }).id);
}

export async function completeJob(
  jobId: string,
  status: "completed" | "failed"
): Promise<void> {
  await fromExec("seo_execution_jobs")
    .update({
      status,
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as never)
    .eq("id", jobId);
}

export async function insertSuggestions(
  jobId: string,
  articleId: string,
  drafts: SuggestionDraft[]
): Promise<number> {
  if (drafts.length === 0) return 0;

  const batch = drafts.map((d) => ({
    job_id: jobId,
    generated_article_id: articleId,
    suggestion_type: d.suggestion_type,
    field_key: d.field_key,
    current_value: d.current_value,
    suggested_value: d.suggested_value,
    reason: d.reason,
    expected_impact: d.expected_impact,
    confidence: d.confidence,
    priority: d.priority,
    status: "pending",
    metadata: d.metadata ?? {},
  }));

  const { error } = await fromExec("seo_execution_suggestions").insert(
    batch as never
  );
  if (error) throw new Error(error.message);
  return batch.length;
}

export async function getSuggestionsByIds(
  ids: string[]
): Promise<ExecutionSuggestion[]> {
  if (ids.length === 0) return [];
  const { data } = await fromExec("seo_execution_suggestions")
    .select("*")
    .in("id", ids);
  return (data ?? []).map((row) =>
    mapSuggestion(row as Record<string, unknown>)
  );
}

export async function getPendingSuggestionsForJob(
  jobId: string
): Promise<ExecutionSuggestion[]> {
  const { data } = await fromExec("seo_execution_suggestions")
    .select("*")
    .eq("job_id", jobId)
    .eq("status", "pending");
  return (data ?? []).map((row) =>
    mapSuggestion(row as Record<string, unknown>)
  );
}

export async function approveSuggestions(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  await fromExec("seo_execution_suggestions")
    .update({ status: "approved", updated_at: new Date().toISOString() } as never)
    .in("id", ids);
}

export async function rejectSuggestions(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  await fromExec("seo_execution_suggestions")
    .update({ status: "rejected", updated_at: new Date().toISOString() } as never)
    .in("id", ids);
}

export async function recordFeedback(input: {
  suggestionId?: string;
  jobId?: string;
  articleId?: string;
  action: string;
  userId?: string;
  userEmail?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  await fromExec("seo_execution_feedback").insert({
    suggestion_id: input.suggestionId ?? null,
    job_id: input.jobId ?? null,
    generated_article_id: input.articleId ?? null,
    action: input.action,
    user_id: input.userId ?? null,
    user_email: input.userEmail ?? null,
    metadata: input.metadata ?? {},
  } as never);
}

export async function getExecutionDashboard(): Promise<ExecutionDashboard> {
  if (!isSupabaseConfigured()) {
    return { jobs: [], pendingCount: 0, appliedCount: 0, recentArticles: [] };
  }

  const [jobsRes, pendingRes, appliedRes, articlesRes] = await Promise.all([
    fromExec("seo_execution_jobs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20),
    fromExec("seo_execution_suggestions")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    fromExec("seo_execution_suggestions")
      .select("id", { count: "exact", head: true })
      .eq("status", "applied"),
    createAdminServerClient()
      .from("generated_articles")
      .select("id, slug, headline")
      .not("published_at", "is", null)
      .order("published_at", { ascending: false })
      .limit(30),
  ]);

  const jobRows = (jobsRes.data ?? []) as Array<Record<string, unknown>>;
  const jobs: ExecutionJob[] = [];

  for (const row of jobRows) {
    const { data: sugData } = await fromExec("seo_execution_suggestions")
      .select("*")
      .eq("job_id", String(row.id))
      .order("priority")
      .limit(50);

    jobs.push({
      id: String(row.id),
      generated_article_id: String(row.generated_article_id),
      article_slug: String(row.article_slug),
      status: row.status as ExecutionJob["status"],
      audit_scores: row.audit_scores as ArticleAuditScores,
      overall_score: (row.overall_score as number | null) ?? null,
      triggered_by: (row.triggered_by as string | null) ?? null,
      completed_at: (row.completed_at as string | null) ?? null,
      created_at: String(row.created_at),
      suggestions: (sugData ?? []).map((s) =>
        mapSuggestion(s as Record<string, unknown>)
      ),
    });
  }

  const recentArticles = await Promise.all(
    ((articlesRes.data ?? []) as Array<{ id: string; slug: string; headline: string }>).map(
      async (a) => {
        const { data: lastJob } = await fromExec("seo_execution_jobs")
          .select("completed_at, overall_score")
          .eq("generated_article_id", a.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        const job = lastJob as { completed_at?: string; overall_score?: number } | null;
        return {
          id: a.id,
          slug: a.slug,
          headline: a.headline,
          lastAuditAt: job?.completed_at ?? null,
          overallScore: job?.overall_score ?? null,
        };
      }
    )
  );

  return {
    jobs,
    pendingCount: pendingRes.count ?? 0,
    appliedCount: appliedRes.count ?? 0,
    recentArticles,
  };
}
