/**
 * AI enrichment queue — non-blocking post-ingestion processing
 */

import { createAdminClient } from "@/lib/supabase";
import type { NewsArticleId } from "@/lib/types/news-article";
import { INFRA_CONFIG } from "@/lib/infrastructure/config";

const QUEUE_BATCH = 10;

import { isAnyChatProviderConfigured, isLocalEnrichEnabled } from "@/lib/ai/providers";

/** Minutes passed to claim_ai_queue_batch RPC (env: AI_QUEUE_STALE_PROCESSING_MS). */
export function getAiQueueStaleReclaimMinutes(): number {
  return Math.max(
    1,
    Math.round(INFRA_CONFIG.aiQueueStaleProcessingMs / 60_000)
  );
}

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

import { promoteRetryReadyAiQueueItems } from "@/lib/news/ai/ai-queue-retry";

export async function countPendingAiQueue(): Promise<number> {
  const supabase = createAdminClient();
  const { count, error } = await supabase
    .from("news_ai_queue")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");

  if (error) return 0;
  return count ?? 0;
}

function mapClaimedArticleIds(data: unknown): NewsArticleId[] {
  if (!Array.isArray(data)) return [];
  return data.map((row: { article_id: NewsArticleId }) => row.article_id);
}

/**
 * Non-atomic fallback when claim_ai_queue_batch RPC is unavailable (pre-migration).
 * Do not use for production concurrency — SELECT then UPDATE can double-claim rows.
 */
async function claimAiQueueBatchFallback(
  limit: number
): Promise<NewsArticleId[]> {
  const supabase = createAdminClient();
  const staleCutoff = new Date(
    Date.now() - INFRA_CONFIG.aiQueueStaleProcessingMs
  ).toISOString();

  await supabase
    .from("news_ai_queue")
    .update({ status: "pending", processing_started_at: null })
    .eq("status", "processing")
    .lt("processing_started_at", staleCutoff);

  // Legacy rows without processing_started_at: fall back to created_at
  await supabase
    .from("news_ai_queue")
    .update({ status: "pending", processing_started_at: null })
    .eq("status", "processing")
    .is("processing_started_at", null)
    .lt("created_at", staleCutoff);

  const { data: pending, error } = await supabase
    .from("news_ai_queue")
    .select("id, article_id")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error || !pending?.length) return [];

  const ids = pending.map((r) => r.id);
  const now = new Date().toISOString();

  const { data: claimed } = await supabase
    .from("news_ai_queue")
    .update({ status: "processing", processing_started_at: now })
    .in("id", ids)
    .eq("status", "pending")
    .select("article_id");

  return (claimed ?? []).map((r) => r.article_id);
}

/**
 * Claim a batch of pending AI enrichment jobs (oldest first).
 *
 * Production path uses claim_ai_queue_batch RPC with FOR UPDATE SKIP LOCKED so
 * concurrent workers cannot claim the same row. Never revert to SELECT+UPDATE
 * without row locks — that pattern caused duplicate OpenAI enrichment (audit P-013).
 */
export async function claimAiQueueBatch(
  limit = QUEUE_BATCH
): Promise<NewsArticleId[]> {
  const supabase = createAdminClient();

  await promoteRetryReadyAiQueueItems().catch(() => 0);

  const { data, error } = await supabase.rpc("claim_ai_queue_batch", {
    claim_limit: limit,
    stale_reclaim_minutes: getAiQueueStaleReclaimMinutes(),
  });

  // Success includes an empty array (queue drained) — do not fall back on [].
  if (!error) {
    return mapClaimedArticleIds(data);
  }

  console.warn(
    JSON.stringify({
      tag: "[ai-queue]",
      phase: "rpc_claim_failed",
      error: error.message,
      fallback: true,
      ts: new Date().toISOString(),
    })
  );

  return claimAiQueueBatchFallback(limit);
}

export async function releaseAiQueueItems(
  articleIds: readonly NewsArticleId[]
): Promise<number> {
  if (!articleIds.length) return 0;
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("news_ai_queue")
    .update({ status: "pending", processing_started_at: null })
    .in("article_id", [...articleIds])
    .eq("status", "processing")
    .select("article_id");

  return data?.length ?? 0;
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
      processing_started_at: null,
      error: errorMessage ?? null,
    })
    .eq("article_id", articleId)
    .in("status", ["pending", "processing"]);
}
