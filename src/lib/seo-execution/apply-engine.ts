/**
 * Module 9 — Apply Engine (human-approved changes only)
 */

import { createAdminServerClient, isSupabaseConfigured } from "@/lib/supabase";
import { jsonObjectFrom } from "@/types/json";
import type { Json } from "@/types/supabase";
import { logExecution } from "@/lib/seo-execution/logger";
import type {
  ApplyResult,
  ArticleSeoSnapshot,
  ExecutionSuggestion,
} from "@/lib/seo-execution/types";

const APPLYABLE_FIELDS = new Set([
  "seo_title",
  "seo_description",
  "og_title",
  "og_description",
  "twitter_title",
  "twitter_description",
  "related_slugs",
  "faq_schema",
  "image_alt",
  "image_caption",
  "image_title",
  "image_description",
  "og_image",
  "suggested_expansion",
  "suggested_expansion_stats",
  "suggested_expansion_sections",
  "suggested_expansion_context",
]);

export async function loadArticleSnapshot(
  articleId: string
): Promise<ArticleSeoSnapshot | null> {
  if (!isSupabaseConfigured()) return null;

  const { data } = await createAdminServerClient()
    .from("generated_articles")
    .select("headline,seo_title,seo_description,slug,editorial_metadata")
    .eq("id", articleId)
    .maybeSingle();

  if (!data) return null;
  const row = data as Record<string, unknown>;
  return {
    headline: String(row.headline),
    seo_title: (row.seo_title as string | null) ?? null,
    seo_description: (row.seo_description as string | null) ?? null,
    slug: String(row.slug),
    editorial_metadata: jsonObjectFrom(row.editorial_metadata as Json | null),
  };
}

function buildMetadataPatch(
  meta: Record<string, unknown>,
  suggestion: ExecutionSuggestion
): Record<string, unknown> {
  const next = { ...meta };
  const key = suggestion.field_key;

  if (key === "related_slugs") {
    try {
      const links = JSON.parse(suggestion.suggested_value) as Array<{ slug: string }>;
      const slugs = links.map((l) => l.slug).filter(Boolean);
      const existing = Array.isArray(next.related_slugs)
        ? (next.related_slugs as string[])
        : [];
      next.related_slugs = [...new Set([...existing, ...slugs])];
    } catch {
      /* skip invalid */
    }
    return next;
  }

  if (key === "faq_schema") {
    try {
      const parsed = JSON.parse(suggestion.suggested_value) as {
        faqs: unknown;
        schema: unknown;
      };
      next.faq = parsed.faqs;
      next.faq_schema = parsed.schema;
    } catch {
      /* skip */
    }
    return next;
  }

  if (key.startsWith("image_") || key === "og_image") {
    const image = { ...((next.image as Record<string, unknown>) ?? {}) };
    if (key === "og_image") {
      image.og_url = suggestion.suggested_value;
    } else {
      image[key.replace("image_", "")] = suggestion.suggested_value;
    }
    next.image = image;
    return next;
  }

  if (key.startsWith("og_") || key.startsWith("twitter_")) {
    next[key] = suggestion.suggested_value;
    return next;
  }

  if (key.startsWith("suggested_expansion")) {
    const expansions = Array.isArray(next.seo_suggested_expansions)
      ? [...(next.seo_suggested_expansions as string[])]
      : [];
    expansions.push(suggestion.suggested_value);
    next.seo_suggested_expansions = expansions;
    return next;
  }

  return next;
}

export async function applyApprovedSuggestions(input: {
  articleId: string;
  articleSlug: string;
  jobId: string;
  suggestions: ExecutionSuggestion[];
  appliedBy: string;
  appliedByEmail?: string;
}): Promise<ApplyResult> {
  if (!isSupabaseConfigured()) {
    return { ok: false, appliedCount: 0, errors: ["supabase_not_configured"] };
  }

  const applicable = input.suggestions.filter(
    (s) =>
      (s.status === "approved" || s.status === "pending") &&
      APPLYABLE_FIELDS.has(s.field_key) &&
      s.field_key !== "slug" &&
      s.field_key !== "seo_title_variant"
  );

  if (applicable.length === 0) {
    return { ok: false, appliedCount: 0, errors: ["no_applicable_suggestions"] };
  }

  const snapshot = await loadArticleSnapshot(input.articleId);
  if (!snapshot) {
    return { ok: false, appliedCount: 0, errors: ["article_not_found"] };
  }

  const supabase = createAdminServerClient();
  const update: Record<string, unknown> = {};
  let meta = { ...snapshot.editorial_metadata };
  const appliedFields: Record<string, string> = {};

  for (const s of applicable) {
    if (s.field_key === "seo_title") {
      update.seo_title = s.suggested_value;
      appliedFields.seo_title = s.suggested_value;
    } else if (s.field_key === "seo_description") {
      update.seo_description = s.suggested_value;
      appliedFields.seo_description = s.suggested_value;
    } else {
      meta = buildMetadataPatch(meta, s);
      appliedFields[s.field_key] = s.suggested_value;
    }
  }

  if (Object.keys(meta).length > 0) {
    update.editorial_metadata = meta;
  }

  const { error: updateError } = await supabase
    .from("generated_articles")
    .update(update as never)
    .eq("id", input.articleId);

  if (updateError) {
    return { ok: false, appliedCount: 0, errors: [updateError.message] };
  }

  const { data: historyRow, error: historyError } = await supabase
    .from("seo_execution_history" as never)
    .insert({
      job_id: input.jobId,
      generated_article_id: input.articleId,
      article_slug: input.articleSlug,
      snapshot,
      applied_fields: appliedFields,
      applied_by: input.appliedBy,
      applied_by_email: input.appliedByEmail ?? null,
      rollback_available: true,
    } as never)
    .select("id")
    .single();

  if (historyError) {
    return { ok: false, appliedCount: applicable.length, errors: [historyError.message] };
  }

  for (const s of applicable) {
    await supabase
      .from("seo_execution_suggestions" as never)
      .update({ status: "applied", updated_at: new Date().toISOString() } as never)
      .eq("id", s.id);
  }

  logExecution("suggestion_applied", {
    articleId: input.articleId,
    count: applicable.length,
    appliedBy: input.appliedBy,
  });

  return {
    ok: true,
    historyId: String((historyRow as { id: string }).id),
    appliedCount: applicable.length,
    errors: [],
  };
}

export async function rollbackExecution(
  historyId: string,
  userId: string,
  userEmail?: string
): Promise<ApplyResult> {
  if (!isSupabaseConfigured()) {
    return { ok: false, appliedCount: 0, errors: ["supabase_not_configured"] };
  }

  const supabase = createAdminServerClient();
  const { data: history } = await supabase
    .from("seo_execution_history" as never)
    .select("*")
    .eq("id", historyId)
    .maybeSingle();

  if (!history) {
    return { ok: false, appliedCount: 0, errors: ["history_not_found"] };
  }

  const row = history as Record<string, unknown>;
  if (!row.rollback_available || row.rolled_back_at) {
    return { ok: false, appliedCount: 0, errors: ["rollback_not_available"] };
  }

  const snapshot = row.snapshot as ArticleSeoSnapshot;
  const articleId = String(row.generated_article_id);
  const { error } = await supabase
    .from("generated_articles")
    .update({
      seo_title: snapshot.seo_title,
      seo_description: snapshot.seo_description,
      editorial_metadata: snapshot.editorial_metadata,
    } as never)
    .eq("id", articleId);

  if (error) {
    return { ok: false, appliedCount: 0, errors: [error.message] };
  }

  await supabase
    .from("seo_execution_history" as never)
    .update({
      rolled_back_at: new Date().toISOString(),
      rollback_available: false,
    } as never)
    .eq("id", historyId);

  await supabase.from("seo_execution_feedback" as never).insert({
    generated_article_id: row.generated_article_id,
    action: "rollback",
    user_id: userId,
    user_email: userEmail ?? null,
    metadata: { historyId },
  } as never);

  logExecution("rollback", { historyId, userId });

  return { ok: true, appliedCount: 1, errors: [], historyId };
}
