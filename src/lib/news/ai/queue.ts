/**
 * AI enrichment queue — non-blocking post-ingestion processing
 */

import { createAdminClient } from "@/lib/supabase";
import type { NewsArticleId } from "@/lib/types/news-article";

const QUEUE_BATCH = 10;

import { isAnyChatProviderConfigured, isLocalEnrichEnabled } from "@/lib/ai/providers";

export function isAiQueueEnabled(): boolean {
  return isAnyChatProviderConfigured() || isLocalEnrichEnabled();
}

export async function enqueueArticlesForAi(
  articleIds: readonly NewsArticleId[]
): Promise<number> {
  if (!isAiQueueEnabled() || !articleIds.length) return 0;

  const supabase = createAdminClient();

  const { data: existing } = await supabase
    .from("news_ai_queue")
    .select("article_id, status")
    .in("article_id", [...articleIds]);

  const blocked = new Set(
    (existing ?? [])
      .filter((r) => r.status === "processing" || r.status === "completed")
      .map((r) => r.article_id)
  );

  const toEnqueue = articleIds.filter((id) => !blocked.has(id));
  if (!toEnqueue.length) return 0;

  const rows = toEnqueue.map((article_id) => ({
    article_id,
    status: "pending" as const,
  }));

  console.log(
    JSON.stringify({
      tag: "[ai-queue]",
      phase: "enqueue_attempt",
      onConflict: "article_id",
      total: rows.length,
      skippedInFlight: articleIds.length - rows.length,
      sampleArticleIds: rows.slice(0, 5).map((r) => r.article_id),
      ts: new Date().toISOString(),
    })
  );

  const { data, error } = await supabase
    .from("news_ai_queue")
    .upsert(rows, { onConflict: "article_id" })
    .select("id");

  if (error) {
    console.warn(
      JSON.stringify({
        tag: "[ai-queue]",
        phase: "enqueue_error",
        onConflict: "article_id",
        total: rows.length,
        sampleArticleIds: rows.slice(0, 5).map((r) => r.article_id),
        error: {
          code: error.code ?? null,
          message: error.message,
          details: error.details ?? null,
          hint: error.hint ?? null,
        },
        ts: new Date().toISOString(),
      })
    );
    return 0;
  }

  const queued = data?.length ?? 0;
  console.log(
    JSON.stringify({
      tag: "[ai-queue]",
      phase: "enqueue_ok",
      requested: rows.length,
      returnedRows: queued,
      ts: new Date().toISOString(),
    })
  );

  return queued;
}

export async function countPendingAiQueue(): Promise<number> {
  const supabase = createAdminClient();
  const { count, error } = await supabase
    .from("news_ai_queue")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");

  if (error) return 0;
  return count ?? 0;
}

export async function claimAiQueueBatch(
  limit = QUEUE_BATCH
): Promise<NewsArticleId[]> {
  const supabase = createAdminClient();
  const staleThreshold = new Date(Date.now() - 10 * 60_000).toISOString();

  await supabase
    .from("news_ai_queue")
    .update({ status: "pending" })
    .eq("status", "processing")
    .lt("created_at", staleThreshold);

  const { data: pending, error } = await supabase
    .from("news_ai_queue")
    .select("id, article_id")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error || !pending?.length) return [];

  const ids = pending.map((r) => r.id);

  const { data: claimed } = await supabase
    .from("news_ai_queue")
    .update({ status: "processing" })
    .in("id", ids)
    .eq("status", "pending")
    .select("article_id");

  return (claimed ?? []).map((r) => r.article_id);
}

export async function markAiQueueCompleted(
  articleId: NewsArticleId,
  ok: boolean,
  errorMessage?: string
): Promise<void> {
  const supabase = createAdminClient();
  await supabase
    .from("news_ai_queue")
    .update({
      status: ok ? "completed" : "failed",
      processed_at: new Date().toISOString(),
      error: errorMessage ?? null,
    })
    .eq("article_id", articleId)
    .in("status", ["pending", "processing"]);
}
