/**
 * Canonical publication layer for generated_articles.
 * All publish / reject / unpublish field mutations should go through here.
 */

import { createAdminServerClient } from "@/lib/supabase";
import {
  deadlineForStatus,
  syncLegacyEditorialStatus,
} from "@/lib/editorial-workflow/engine";
import type { WorkflowStatus } from "@/lib/editorial-workflow/types";
import { buildPublicPublishPatch } from "@/lib/newsroom/publish-state";
import type { GeneratedArticleInsert } from "@/lib/types/newsroom";

export type PublicationResult = { ok: boolean; message?: string };

/** Patch shape for generated_articles updates including workflow columns. */
export type GeneratedArticlePatch = Partial<GeneratedArticleInsert> & {
  workflow_deadline_at?: string | null;
  workflow_rejection_reason?: string | null;
  workflow_assigned_to?: string | null;
};

export function buildRejectPatch(now = new Date()): GeneratedArticlePatch {
  const iso = now.toISOString();
  return {
    editorial_status: "rejected",
    published_at: null,
    workflow_status: "draft",
    homepage_pin: false,
    reviewed_at: iso,
  };
}

export function buildWorkflowTransitionPatch(input: {
  toStatus: WorkflowStatus;
  publishedAt?: string | null;
  rejectionReason?: string | null;
  assignToUserId?: string | null;
}): GeneratedArticlePatch {
  const now = new Date();

  if (input.toStatus === "published") {
    return buildPublicPublishPatch(now);
  }

  if (input.toStatus === "draft" && input.rejectionReason) {
    return {
      ...buildRejectPatch(now),
      editorial_status: "rejected",
      workflow_status: "draft",
      workflow_rejection_reason: input.rejectionReason.trim(),
      workflow_deadline_at: deadlineForStatus("draft"),
    };
  }

  let publishedAt = input.publishedAt ?? null;
  if (input.toStatus === "scheduled" && !publishedAt) {
    publishedAt = null;
  }

  const patch: GeneratedArticlePatch = {
    workflow_status: input.toStatus,
    workflow_deadline_at: deadlineForStatus(input.toStatus),
    workflow_rejection_reason: null,
    editorial_status: syncLegacyEditorialStatus(input.toStatus, publishedAt),
    published_at: publishedAt,
    reviewed_at: now.toISOString(),
  };

  if (input.assignToUserId !== undefined) {
    patch.workflow_assigned_to = input.assignToUserId;
  }

  return patch;
}

export async function applyGeneratedArticlePatch(
  articleId: string,
  tenantId: string,
  patch: GeneratedArticlePatch
): Promise<PublicationResult> {
  const supabase = createAdminServerClient();
  const { error } = await supabase
    .from("generated_articles")
    .update(patch)
    .eq("id", articleId)
    .eq("tenant_id", tenantId);

  if (error) return { ok: false, message: error.message };
  return { ok: true };
}

export async function publishGeneratedArticle(
  articleId: string,
  tenantId: string
): Promise<PublicationResult> {
  const supabase = createAdminServerClient();
  const { data: row, error } = await supabase
    .from("generated_articles")
    .select(
      "id, headline, summary, article_body, language, editorial_metadata, event_id, geo_metadata"
    )
    .eq("id", articleId)
    .eq("tenant_id", tenantId)
    .maybeSingle();

  if (error || !row) {
    return { ok: false, message: error?.message ?? "article_not_found" };
  }

  const { validateGeneratedArticle } = await import(
    "@/lib/news/ai/generated-article-validation"
  );
  const meta =
    row.editorial_metadata && typeof row.editorial_metadata === "object"
      ? (row.editorial_metadata as Record<string, unknown>)
      : {};
  const attributions = Array.isArray(meta.source_attribution)
    ? (meta.source_attribution as Array<{
        source?: string | null;
        article_url?: string | null;
        signal_id?: string | null;
      }>)
    : [];
  const geo =
    row.geo_metadata && typeof row.geo_metadata === "object"
      ? (row.geo_metadata as Record<string, unknown>)
      : {};
  const validation = validateGeneratedArticle({
    headline: row.headline ?? "",
    summary: row.summary ?? "",
    articleBody: row.article_body ?? "",
    language: row.language,
    category: typeof meta.category === "string" ? meta.category : "world",
    region:
      typeof geo.primary_district === "string"
        ? geo.primary_district
        : typeof geo.region === "string"
          ? geo.region
          : null,
    sourceAttributions: attributions,
    generationMetadata: meta,
    eventId: row.event_id,
    stage: "publish",
    allowDeskDraft: meta.draft_state != null && attributions.length === 0,
  });

  // Desk drafts with empty bodies must never become public.
  if (!validation.ok && meta.draft_state != null) {
    return {
      ok: false,
      message: `validation_failed:${validation.codes.join(",")}`,
    };
  }
  if (!validation.ok) {
    return {
      ok: false,
      message: `validation_failed:${validation.codes.join(",")}`,
    };
  }

  const result = await applyGeneratedArticlePatch(
    articleId,
    tenantId,
    buildPublicPublishPatch()
  );
  if (result.ok) {
    const { publishArticlePublished } = await import(
      "@/lib/infrastructure/events/event-bus"
    );
    void publishArticlePublished({ articleId, tenantId }).catch(() => undefined);
  }
  return result;
}

export async function rejectGeneratedArticle(
  articleId: string,
  tenantId: string
): Promise<PublicationResult> {
  return applyGeneratedArticlePatch(articleId, tenantId, buildRejectPatch());
}

export async function logDeskPublicationEvent(input: {
  tenantId: string;
  articleId: string;
  actorUserId?: string | null;
  actorEmail?: string | null;
  event: "published" | "rejected";
  fromWorkflowStatus?: WorkflowStatus | null;
}): Promise<void> {
  const supabase = createAdminServerClient();
  await supabase.from("editorial_workflow_events").insert({
    tenant_id: input.tenantId,
    article_id: input.articleId,
    actor_user_id: input.actorUserId ?? null,
    actor_email: input.actorEmail ?? null,
    event_type: input.event === "rejected" ? "rejected" : "transition",
    from_status: input.fromWorkflowStatus ?? null,
    to_status: input.event === "rejected" ? "draft" : "published",
    payload: { source: "desk_action" },
  });
}
