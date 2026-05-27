/**
 * AI enrichment queue — non-blocking post-ingestion processing
 */

import { createAdminClient } from "@/lib/supabase";
import type { NewsArticleId } from "@/lib/types/news-article";

const QUEUE_BATCH = 10;

export function isAiQueueEnabled(): boolean {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

export async function enqueueArticlesForAi(
  articleIds: readonly NewsArticleId[]
): Promise<number> {
  if (!isAiQueueEnabled() || !articleIds.length) return 0;

  const supabase = createAdminClient();
  const rows = articleIds.map((article_id) => ({
    article_id,
    status: "pending" as const,
  }));

  const { data, error } = await supabase
    .from("news_ai_queue")
    .upsert(rows, { onConflict: "article_id" })
    .select("id");

  if (error) {
    console.warn("[ai-queue] enqueue:", error.message);
    return 0;
  }

  return data?.length ?? 0;
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

  const { data: pending, error } = await supabase
    .from("news_ai_queue")
    .select("id, article_id")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error || !pending?.length) return [];

  const ids = pending.map((r) => r.id);
  const articleIds = pending.map((r) => r.article_id);

  await supabase
    .from("news_ai_queue")
    .update({ status: "processing" })
    .in("id", ids);

  return articleIds;
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
