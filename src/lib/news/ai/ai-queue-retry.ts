/**
 * AI queue retry metadata — encoded in existing `error` column (no schema change)
 */

import { createAdminClient } from "@/lib/supabase";
import type { NewsArticleId } from "@/lib/types/news-article";
import { computeRetryBackoff } from "@/lib/news/ai/editorial-image-retry";

const RETRY_PREFIX = "__retry__:";
const DEFAULT_MAX_ATTEMPTS = Number(process.env.AI_QUEUE_MAX_ATTEMPTS) || 4;

export type AiQueueRetryMeta = {
  v: 1;
  attempt: number;
  nextRetryAt?: string;
  lastError: string;
  dead?: boolean;
};

export function encodeAiQueueRetryMeta(meta: AiQueueRetryMeta): string {
  return `${RETRY_PREFIX}${JSON.stringify(meta)}`;
}

export function parseAiQueueRetryMeta(
  error: string | null | undefined
): AiQueueRetryMeta | null {
  if (!error?.startsWith(RETRY_PREFIX)) return null;
  try {
    const parsed = JSON.parse(error.slice(RETRY_PREFIX.length)) as AiQueueRetryMeta;
    if (parsed?.v === 1) return parsed;
  } catch {
    /* plain error string */
  }
  return null;
}

export function isPermanentAiError(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes("no_enrichment") ||
    m.includes("article_not_found") ||
    m.includes("invalid") ||
    m.includes("unauthorized") ||
    m.includes("401") ||
    m.includes("403")
  );
}

export async function promoteRetryReadyAiQueueItems(): Promise<number> {
  const supabase = createAdminClient();
  const now = new Date().toISOString();

  const { data: failed } = await supabase
    .from("news_ai_queue")
    .select("id, article_id, error")
    .eq("status", "failed")
    .limit(200);

  if (!failed?.length) return 0;

  let promoted = 0;
  for (const row of failed) {
    const meta = parseAiQueueRetryMeta(row.error);
    if (!meta || meta.dead) continue;
    if (meta.nextRetryAt && meta.nextRetryAt > now) continue;

    const { data } = await supabase
      .from("news_ai_queue")
      .update({ status: "pending" })
      .eq("id", row.id)
      .eq("status", "failed")
      .select("id");

    if (data?.length) promoted++;
  }
  return promoted;
}

export async function markAiQueueOutcome(
  articleId: NewsArticleId,
  ok: boolean,
  errorMessage?: string,
  options?: { retryable?: boolean; attempt?: number }
): Promise<void> {
  const supabase = createAdminClient();

  if (ok) {
    await supabase
      .from("news_ai_queue")
      .update({
        status: "completed",
        processed_at: new Date().toISOString(),
        error: null,
      })
      .eq("article_id", articleId)
      .in("status", ["pending", "processing"]);
    return;
  }

  const msg = errorMessage ?? "unknown_error";
  const retryable =
    options?.retryable ?? (!isPermanentAiError(msg) && msg.length > 0);
  const attempt = (options?.attempt ?? 0) + 1;
  const maxAttempts = DEFAULT_MAX_ATTEMPTS;
  const dead = !retryable || attempt >= maxAttempts;

  if (dead) {
    const meta: AiQueueRetryMeta = {
      v: 1,
      attempt,
      lastError: msg,
      dead: true,
    };
    await supabase
      .from("news_ai_queue")
      .update({
        status: "failed",
        processed_at: new Date().toISOString(),
        error: encodeAiQueueRetryMeta(meta),
      })
      .eq("article_id", articleId)
      .in("status", ["pending", "processing"]);
    return;
  }

  const delayMs = computeRetryBackoff(attempt, {
    maxRepairAttempts: maxAttempts,
    maxQueueAttempts: maxAttempts,
    baseBackoffMs: Number(process.env.AI_QUEUE_BACKOFF_MS) || 60_000,
    maxBackoffMs: Number(process.env.AI_QUEUE_MAX_BACKOFF_MS) || 600_000,
  });
  const nextRetryAt = new Date(Date.now() + delayMs).toISOString();
  const meta: AiQueueRetryMeta = {
    v: 1,
    attempt,
    nextRetryAt,
    lastError: msg,
    dead: false,
  };

  await supabase
    .from("news_ai_queue")
    .update({
      status: "pending",
      processed_at: null,
      error: encodeAiQueueRetryMeta(meta),
    })
    .eq("article_id", articleId)
    .in("status", ["pending", "processing"]);
}

export async function countDeadAiQueue(): Promise<number> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("news_ai_queue")
    .select("error")
    .eq("status", "failed")
    .limit(500);

  return (data ?? []).filter((r) => parseAiQueueRetryMeta(r.error)?.dead).length;
}
