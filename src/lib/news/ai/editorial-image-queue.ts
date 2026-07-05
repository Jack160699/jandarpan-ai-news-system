/**
 * Editorial image generation queue — atomic claims, backoff retries, history
 */

import { createAdminServerClient } from "@/lib/supabase";
import type { Json } from "@/types/supabase";
import {
  appendRetryLog,
  computeScheduledAt,
  getRetryConfig,
  type RetryLogEntry,
} from "@/lib/news/ai/editorial-image-retry";

export type EditorialImageQueueStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed";

export type EditorialImageApprovalStatus =
  | "auto"
  | "pending_review"
  | "approved"
  | "rejected";

export type EditorialImageQueueRow = {
  id: string;
  generated_article_id: string;
  status: EditorialImageQueueStatus;
  attempts: number;
  max_attempts: number;
  prompt_hash: string | null;
  hero_image_url: string | null;
  og_image_url: string | null;
  image_source: string | null;
  error: string | null;
  created_at: string;
  processed_at: string | null;
  scheduled_at?: string | null;
  custom_prompt?: string | null;
  approval_status?: EditorialImageApprovalStatus;
  processing_started_at?: string | null;
  priority?: number;
  generation_history?: RetryLogEntry[];
};

function getDefaultMaxAttempts(): number {
  return getRetryConfig().maxQueueAttempts;
}

export async function enqueueEditorialImage(
  generatedArticleId: string,
  options?: { customPrompt?: string; priority?: number }
): Promise<boolean> {
  const supabase = createAdminServerClient();
  const { error } = await supabase.from("editorial_image_queue").upsert(
    {
      generated_article_id: generatedArticleId,
      status: "pending",
      attempts: 0,
      max_attempts: getDefaultMaxAttempts(),
      scheduled_at: null,
      processing_started_at: null,
      error: null,
      custom_prompt: options?.customPrompt ?? null,
      priority: options?.priority ?? 0,
      approval_status: "auto",
      generation_history: [] as Json,
    },
    { onConflict: "generated_article_id" }
  );

  if (error) {
    console.warn("[editorial-image-queue] enqueue:", error.message);
    return false;
  }
  return true;
}

export async function countPendingEditorialImages(): Promise<number> {
  const supabase = createAdminServerClient();
  const { count } = await supabase
    .from("editorial_image_queue")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");

  return count ?? 0;
}

export async function countProcessingEditorialImages(): Promise<number> {
  const supabase = createAdminServerClient();
  const { count } = await supabase
    .from("editorial_image_queue")
    .select("id", { count: "exact", head: true })
    .eq("status", "processing");

  return count ?? 0;
}

export async function findDuplicateImageByVisualHash(
  visualHash: string,
  isNearDuplicate: (a: string, b: string) => boolean
): Promise<{
  hero_image_url: string;
  og_image_url: string | null;
  matchedHash: string;
} | null> {
  const supabase = createAdminServerClient();
  const { data: articles } = await supabase
    .from("generated_articles")
    .select("hero_image_url, editorial_metadata")
    .not("hero_image_url", "is", null)
    .order("created_at", { ascending: false })
    .limit(100);

  for (const art of articles ?? []) {
    const img = (art.editorial_metadata as { image?: { visual_hash?: string; og_url?: string } })
      ?.image;
    const existing = img?.visual_hash;
    if (existing && isNearDuplicate(visualHash, existing) && art.hero_image_url) {
      return {
        hero_image_url: art.hero_image_url,
        og_image_url: img?.og_url ?? null,
        matchedHash: existing,
      };
    }
  }

  return null;
}

export async function findDuplicateImageByPromptHash(
  promptHash: string
): Promise<{ hero_image_url: string; og_image_url: string | null } | null> {
  const supabase = createAdminServerClient();
  const { data } = await supabase
    .from("editorial_image_queue")
    .select("hero_image_url, og_image_url")
    .eq("prompt_hash", promptHash)
    .eq("status", "completed")
    .not("hero_image_url", "is", null)
    .order("processed_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data?.hero_image_url) return null;
  return {
    hero_image_url: data.hero_image_url,
    og_image_url: data.og_image_url,
  };
}

export async function getQueueRowForArticle(
  articleId: string
): Promise<EditorialImageQueueRow | null> {
  const supabase = createAdminServerClient();
  const { data } = await supabase
    .from("editorial_image_queue")
    .select("*")
    .eq("generated_article_id", articleId)
    .maybeSingle();

  return (data as EditorialImageQueueRow | null) ?? null;
}

export async function claimEditorialImageBatch(
  limit = 5
): Promise<EditorialImageQueueRow[]> {
  const supabase = createAdminServerClient();

  const { data, error } = await supabase.rpc("claim_editorial_image_batch", {
    claim_limit: limit,
  });

  if (!error && data?.length) {
    return data as EditorialImageQueueRow[];
  }

  if (error) {
    console.warn("[editorial-image-queue] rpc claim failed, fallback:", error.message);
  }

  return claimEditorialImageBatchFallback(limit);
}

async function claimEditorialImageBatchFallback(
  limit: number
): Promise<EditorialImageQueueRow[]> {
  const supabase = createAdminServerClient();
  const staleCutoff = new Date(Date.now() - 10 * 60_000).toISOString();

  await supabase
    .from("editorial_image_queue")
    .update({
      status: "pending",
      processing_started_at: null,
    })
    .eq("status", "processing")
    .lt("processing_started_at", staleCutoff);

  const now = new Date().toISOString();
  const { data: pending } = await supabase
    .from("editorial_image_queue")
    .select("*")
    .eq("status", "pending")
    .or(`scheduled_at.is.null,scheduled_at.lte.${now}`)
    .order("priority", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(limit);

  if (!pending?.length) return [];

  const ids = pending.map((r) => r.id);
  const { data: claimed } = await supabase
    .from("editorial_image_queue")
    .update({
      status: "processing",
      processing_started_at: now,
    })
    .in("id", ids)
    .eq("status", "pending")
    .select("*");

  return (claimed ?? []) as EditorialImageQueueRow[];
}

export async function releaseEditorialImageBatch(
  queueIds: string[]
): Promise<number> {
  if (!queueIds.length) return 0;
  const supabase = createAdminServerClient();
  const { data } = await supabase
    .from("editorial_image_queue")
    .update({
      status: "pending",
      processing_started_at: null,
    })
    .in("id", queueIds)
    .eq("status", "processing")
    .select("id");

  return data?.length ?? 0;
}

export async function markEditorialImageCompletedWithMeta(input: {
  queueId: string;
  generatedArticleId: string;
  heroImageUrl: string;
  ogImageUrl: string | null;
  imageSource: string;
  promptHash: string | null;
  imageMeta: Record<string, unknown>;
  approvalStatus?: EditorialImageApprovalStatus;
}): Promise<void> {
  const supabase = createAdminServerClient();
  const now = new Date().toISOString();

  await supabase
    .from("editorial_image_queue")
    .update({
      status: "completed",
      hero_image_url: input.heroImageUrl,
      og_image_url: input.ogImageUrl,
      image_source: input.imageSource,
      prompt_hash: input.promptHash,
      processed_at: now,
      processing_started_at: null,
      error: null,
      approval_status: input.approvalStatus ?? "auto",
    })
    .eq("id", input.queueId);

  const { data: article } = await supabase
    .from("generated_articles")
    .select("editorial_metadata")
    .eq("id", input.generatedArticleId)
    .single();

  const meta = (article?.editorial_metadata ?? {}) as Record<string, unknown>;

  await supabase
    .from("generated_articles")
    .update({
      hero_image_url: input.heroImageUrl,
      editorial_metadata: {
        ...meta,
        image: {
          ...input.imageMeta,
          hero_url: input.heroImageUrl,
          og_url: input.ogImageUrl ?? input.heroImageUrl,
          source: input.imageSource,
          prompt_hash: input.promptHash,
          processed_at: now,
          status: "completed",
          approval_status: input.approvalStatus ?? "auto",
        },
      },
    })
    .eq("id", input.generatedArticleId);
}

export async function markEditorialImageFailed(input: {
  queueId: string;
  generatedArticleId: string;
  attempts: number;
  maxAttempts: number;
  error: string;
  retry: boolean;
  fallbackHeroUrl?: string;
  fallbackOgUrl?: string | null;
  imageSource?: string;
  generationHistory?: RetryLogEntry[];
}): Promise<void> {
  const supabase = createAdminServerClient();
  const nextAttempts = input.attempts + 1;
  const status = input.retry ? "pending" : "failed";
  const scheduledAt = input.retry ? computeScheduledAt(nextAttempts) : null;

  await supabase
    .from("editorial_image_queue")
    .update({
      status,
      attempts: nextAttempts,
      error: input.error.slice(0, 500),
      processed_at: input.retry ? null : new Date().toISOString(),
      processing_started_at: null,
      scheduled_at: scheduledAt,
      hero_image_url: input.fallbackHeroUrl ?? null,
      og_image_url: input.fallbackOgUrl ?? null,
      image_source: input.imageSource ?? null,
      generation_history: (input.generationHistory ?? []) as unknown as Json,
    })
    .eq("id", input.queueId);

  if (!input.retry && input.fallbackHeroUrl) {
    await supabase
      .from("generated_articles")
      .update({ hero_image_url: input.fallbackHeroUrl })
      .eq("id", input.generatedArticleId);
  }
}

export async function updateQueueCustomPrompt(
  articleId: string,
  customPrompt: string
): Promise<boolean> {
  const supabase = createAdminServerClient();
  const { error } = await supabase
    .from("editorial_image_queue")
    .update({ custom_prompt: customPrompt.slice(0, 4000) })
    .eq("generated_article_id", articleId);

  return !error;
}

export async function setImageApprovalStatus(
  articleId: string,
  approvalStatus: EditorialImageApprovalStatus
): Promise<boolean> {
  const supabase = createAdminServerClient();
  const { error } = await supabase
    .from("editorial_image_queue")
    .update({ approval_status: approvalStatus })
    .eq("generated_article_id", articleId);

  if (error) return false;

  const { data: article } = await supabase
    .from("generated_articles")
    .select("editorial_metadata")
    .eq("id", articleId)
    .single();

  const meta = (article?.editorial_metadata ?? {}) as Record<string, unknown>;
  const imageMeta = (meta.image as Record<string, unknown> | undefined) ?? {};

  await supabase
    .from("generated_articles")
    .update({
      editorial_metadata: {
        ...meta,
        image: { ...imageMeta, approval_status: approvalStatus },
      },
    })
    .eq("id", articleId);

  return true;
}

export async function replaceArticleHeroImage(
  articleId: string,
  heroUrl: string,
  ogUrl?: string
): Promise<boolean> {
  const supabase = createAdminServerClient();
  const { data: article } = await supabase
    .from("generated_articles")
    .select("editorial_metadata")
    .eq("id", articleId)
    .single();

  const meta = (article?.editorial_metadata ?? {}) as Record<string, unknown>;
  const imageMeta = (meta.image as Record<string, unknown> | undefined) ?? {};
  const now = new Date().toISOString();

  const { error } = await supabase
    .from("generated_articles")
    .update({
      hero_image_url: heroUrl,
      editorial_metadata: {
        ...meta,
        image: {
          ...imageMeta,
          hero_url: heroUrl,
          og_url: ogUrl ?? heroUrl,
          source: "manual_replace",
          processed_at: now,
          status: "completed",
        },
      },
    })
    .eq("id", articleId);

  if (error) return false;

  await supabase
    .from("editorial_image_queue")
    .update({
      hero_image_url: heroUrl,
      og_image_url: ogUrl ?? heroUrl,
      image_source: "manual_replace",
      status: "completed",
      processed_at: now,
    })
    .eq("generated_article_id", articleId);

  return true;
}

export { appendRetryLog };
