/**
 * Editorial image generation queue — retries + duplicate prompt prevention
 */

import { createAdminServerClient } from "@/lib/supabase";

export type EditorialImageQueueStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed";

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
};

const DEFAULT_MAX_ATTEMPTS = 3;

export async function enqueueEditorialImage(
  generatedArticleId: string
): Promise<boolean> {
  const supabase = createAdminServerClient();
  const { error } = await supabase.from("editorial_image_queue").upsert(
    {
      generated_article_id: generatedArticleId,
      status: "pending",
      attempts: 0,
      max_attempts: DEFAULT_MAX_ATTEMPTS,
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

export async function claimEditorialImageBatch(
  limit = 5
): Promise<EditorialImageQueueRow[]> {
  const supabase = createAdminServerClient();

  const { data: pending, error } = await supabase
    .from("editorial_image_queue")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error || !pending?.length) return [];

  const ids = pending.map((r) => r.id);
  await supabase
    .from("editorial_image_queue")
    .update({ status: "processing" })
    .in("id", ids);

  return pending as EditorialImageQueueRow[];
}

export async function markEditorialImageCompleted(input: {
  queueId: string;
  generatedArticleId: string;
  heroImageUrl: string;
  ogImageUrl: string | null;
  imageSource: string;
  promptHash: string | null;
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
      error: null,
    })
    .eq("id", input.queueId);

  const { data: article } = await supabase
    .from("generated_articles")
    .select("editorial_metadata")
    .eq("id", input.generatedArticleId)
    .single();

  const meta = (article?.editorial_metadata ?? {}) as Record<string, unknown>;
  const imageMeta = (meta.image as Record<string, unknown> | undefined) ?? {};

  await supabase
    .from("generated_articles")
    .update({
      hero_image_url: input.heroImageUrl,
      editorial_metadata: {
        ...meta,
        image: {
          ...imageMeta,
          hero_url: input.heroImageUrl,
          og_url: input.ogImageUrl ?? input.heroImageUrl,
          source: input.imageSource,
          prompt_hash: input.promptHash,
          processed_at: now,
          status: "completed",
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
}): Promise<void> {
  const supabase = createAdminServerClient();
  const nextAttempts = input.attempts + 1;
  const status = input.retry ? "pending" : "failed";

  await supabase
    .from("editorial_image_queue")
    .update({
      status,
      attempts: nextAttempts,
      error: input.error.slice(0, 500),
      processed_at: input.retry ? null : new Date().toISOString(),
      hero_image_url: input.fallbackHeroUrl ?? null,
      og_image_url: input.fallbackOgUrl ?? null,
      image_source: input.imageSource ?? null,
    })
    .eq("id", input.queueId);

  if (!input.retry && input.fallbackHeroUrl) {
    await supabase
      .from("generated_articles")
      .update({ hero_image_url: input.fallbackHeroUrl })
      .eq("id", input.generatedArticleId);
  }
}
