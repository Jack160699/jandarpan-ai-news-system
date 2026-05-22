/**
 * AI editorial image pipeline — contextual hero visuals for generated_articles
 *
 * Fallback hierarchy:
 * 1. AI-generated illustration (queued, moderated, compressed, CDN upload)
 * 2. Extracted source signal image
 * 3. Category editorial illustration
 */

import { createAdminServerClient } from "@/lib/supabase";
import { getPublicSupabaseEnv } from "@/lib/supabase/env";
import { scoreSourceConfidence } from "@/lib/news/ai/event-clustering";
import {
  buildEditorialImagePrompt,
  hashImagePrompt,
  moderateEditorialImageContext,
  moderateGeneratedPrompt,
} from "@/lib/news/ai/editorial-image-moderation";
import {
  buildOpenGraphImageUrl,
  compressEditorialImage,
  optimizeCdnImageUrl,
} from "@/lib/news/ai/editorial-image-compress";
import {
  claimEditorialImageBatch,
  enqueueEditorialImage,
  findDuplicateImageByPromptHash,
  markEditorialImageCompleted,
  markEditorialImageFailed,
  type EditorialImageQueueRow,
} from "@/lib/news/ai/editorial-image-queue";
import { resolveFallbackImage } from "@/lib/news/images/fallbacks";
import { isDisplayableImage } from "@/lib/news/images/validate";
import { logNewsroom } from "@/lib/newsroom/logger";
import type {
  GeneratedArticleRow,
  NewsEventRow,
  NewsSignalRow,
} from "@/lib/types/newsroom";

const OPENAI_IMAGES_URL = "https://api.openai.com/v1/images/generations";
const IMAGE_TIMEOUT_MS = 45_000;
export type EditorialImageSource =
  | "ai_generated"
  | "source_extracted"
  | "category_fallback"
  | "duplicate_reuse";

export type EditorialImageMetadata = {
  source: EditorialImageSource;
  hero_url: string;
  og_url: string;
  prompt_hash?: string | null;
  prompt?: string | null;
  moderation_flags?: string[];
  status?: "queued" | "completed" | "failed";
  compressed?: boolean;
  storage_path?: string | null;
  width?: number;
  height?: number;
  processed_at?: string;
};

export type ResolveEditorialImageResult = {
  hero_image_url: string;
  og_image_url: string;
  source: EditorialImageSource;
  metadata: EditorialImageMetadata;
};

export type ProcessEditorialImageQueueResult = {
  processed: number;
  completed: number;
  failed: number;
  skipped: number;
  errors: string[];
};

function logImage(message: string, context?: Record<string, unknown>): void {
  console.log(`[editorial-image] ${message}`, context ? JSON.stringify(context) : "");
  logNewsroom("editorial-image", message, context);
}

export function isEditorialImageGenerationEnabled(): boolean {
  return (
    process.env.NEWSROOM_EDITORIAL_IMAGES === "true" &&
    Boolean(process.env.OPENAI_API_KEY?.trim())
  );
}

function getStorageBucket(): string {
  return process.env.NEWSROOM_STORAGE_BUCKET?.trim() || "editorial-images";
}

function pickSourceSignalImage(signals: NewsSignalRow[]): string | null {
  const ranked = [...signals].sort(
    (a, b) => scoreSourceConfidence(b) - scoreSourceConfidence(a)
  );
  for (const s of ranked) {
    if (s.image_url && isDisplayableImage(s.image_url)) {
      return optimizeCdnImageUrl(s.image_url, 1200);
    }
  }
  return null;
}

export function resolveCategoryFallbackHero(category: string): string {
  return optimizeCdnImageUrl(resolveFallbackImage({ category }), 1200);
}

async function downloadImageBuffer(url: string): Promise<Buffer | null> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(12_000),
      headers: { Accept: "image/*" },
    });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    return buf.length > 1024 ? buf : null;
  } catch {
    return null;
  }
}

async function uploadEditorialVariants(input: {
  slug: string;
  promptHash: string;
  hero: Buffer;
  og: Buffer;
}): Promise<{ heroUrl: string; ogUrl: string; heroPath: string } | null> {
  const supabase = createAdminServerClient();
  const bucket = getStorageBucket();
  const basePath = `${input.slug.slice(0, 80)}/${input.promptHash}`;

  const heroPath = `${basePath}-hero.webp`;
  const ogPath = `${basePath}-og.webp`;

  const heroUp = await supabase.storage.from(bucket).upload(heroPath, input.hero, {
    contentType: "image/webp",
    cacheControl: "31536000",
    upsert: true,
  });

  if (heroUp.error) {
    logImage("storage_upload_hero_failed", { message: heroUp.error.message });
    return null;
  }

  const ogUp = await supabase.storage.from(bucket).upload(ogPath, input.og, {
    contentType: "image/webp",
    cacheControl: "31536000",
    upsert: true,
  });

  if (ogUp.error) {
    logImage("storage_upload_og_failed", { message: ogUp.error.message });
  }

  const { url: supabaseUrl } = getPublicSupabaseEnv();
  const heroPub = supabase.storage.from(bucket).getPublicUrl(heroPath);
  const ogPub = supabase.storage.from(bucket).getPublicUrl(ogPath);

  const heroUrl =
    heroPub.data.publicUrl ||
    `${supabaseUrl}/storage/v1/object/public/${bucket}/${heroPath}`;
  const ogUrl = ogUp.error
    ? heroUrl
    : ogPub.data.publicUrl ||
      `${supabaseUrl}/storage/v1/object/public/${bucket}/${ogPath}`;

  return { heroUrl, ogUrl, heroPath };
}

async function generateOpenAiIllustration(
  prompt: string
): Promise<Buffer | null> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return null;

  const promptCheck = moderateGeneratedPrompt(prompt);
  if (!promptCheck.safe) {
    logImage("prompt_moderation_blocked", { flags: promptCheck.flags });
    return null;
  }

  const model =
    process.env.NEWSROOM_IMAGE_MODEL?.trim() ||
    process.env.OPENAI_IMAGE_MODEL?.trim() ||
    "dall-e-3";

  const body: Record<string, unknown> = {
    model,
    prompt: prompt.slice(0, 4000),
    n: 1,
    size: model.includes("dall-e-3") ? "1792x1024" : "1024x1024",
    response_format: "url",
  };

  if (model.includes("dall-e-3")) {
    body.quality = "standard";
    body.style = "vivid";
  }

  const res = await fetch(OPENAI_IMAGES_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(IMAGE_TIMEOUT_MS),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`OpenAI images HTTP ${res.status}: ${errText.slice(0, 200)}`);
  }

  const json = (await res.json()) as {
    data?: Array<{ url?: string; revised_prompt?: string }>;
  };

  const imageUrl = json.data?.[0]?.url;
  if (!imageUrl) return null;

  return downloadImageBuffer(imageUrl);
}

/**
 * Resolve hero image with full fallback hierarchy (sync).
 */
export async function resolveEditorialHeroImage(input: {
  headline: string;
  category: string;
  region: string | null;
  urgencyScore: number;
  eventSummary: string | null;
  slug: string;
  signals?: NewsSignalRow[];
  skipAi?: boolean;
}): Promise<ResolveEditorialImageResult> {
  const moderation = moderateEditorialImageContext({
    headline: input.headline,
    eventSummary: input.eventSummary,
    category: input.category,
  });

  const categoryFallback = resolveCategoryFallbackHero(input.category);
  const sourceImage = input.signals?.length
    ? pickSourceSignalImage(input.signals)
    : null;

  if (!isEditorialImageGenerationEnabled() || input.skipAi || !moderation.allowed) {
    const url = sourceImage ?? categoryFallback;
    return {
      hero_image_url: url,
      og_image_url: buildOpenGraphImageUrl(url),
      source: sourceImage ? "source_extracted" : "category_fallback",
      metadata: {
        source: sourceImage ? "source_extracted" : "category_fallback",
        hero_url: url,
        og_url: buildOpenGraphImageUrl(url),
        moderation_flags: moderation.flags,
        status: "completed",
      },
    };
  }

  const prompt = buildEditorialImagePrompt({
    headline: input.headline,
    category: input.category,
    region: input.region,
    urgencyScore: input.urgencyScore,
    eventSummary: input.eventSummary,
    moderation,
  });

  const promptHash = hashImagePrompt(prompt);

  const duplicate = await findDuplicateImageByPromptHash(promptHash);
  if (duplicate) {
    const og = duplicate.og_image_url ?? buildOpenGraphImageUrl(duplicate.hero_image_url);
    return {
      hero_image_url: duplicate.hero_image_url,
      og_image_url: og,
      source: "duplicate_reuse",
      metadata: {
        source: "duplicate_reuse",
        hero_url: duplicate.hero_image_url,
        og_url: og,
        prompt_hash: promptHash,
        status: "completed",
      },
    };
  }

  try {
    const rawBuffer = await generateOpenAiIllustration(prompt);
    if (!rawBuffer) {
      throw new Error("ai_generation_empty");
    }

    const compressed = await compressEditorialImage(rawBuffer);
    const uploaded = await uploadEditorialVariants({
      slug: input.slug,
      promptHash,
      hero: compressed.hero,
      og: compressed.og,
    });

    if (uploaded) {
      return {
        hero_image_url: uploaded.heroUrl,
        og_image_url: uploaded.ogUrl,
        source: "ai_generated",
        metadata: {
          source: "ai_generated",
          hero_url: uploaded.heroUrl,
          og_url: uploaded.ogUrl,
          prompt_hash: promptHash,
          prompt: prompt.slice(0, 500),
          moderation_flags: moderation.flags,
          compressed: true,
          storage_path: uploaded.heroPath,
          width: compressed.heroWidth,
          height: compressed.heroHeight,
          status: "completed",
          processed_at: new Date().toISOString(),
        },
      };
    }

    logImage("storage_unavailable_using_fallback");
  } catch (err) {
    const msg = err instanceof Error ? err.message : "ai_image_failed";
    logImage("ai_generation_failed", { message: msg });
  }

  const url = sourceImage ?? categoryFallback;
  return {
    hero_image_url: url,
    og_image_url: buildOpenGraphImageUrl(url),
    source: sourceImage ? "source_extracted" : "category_fallback",
    metadata: {
      source: sourceImage ? "source_extracted" : "category_fallback",
      hero_url: url,
      og_url: buildOpenGraphImageUrl(url),
      moderation_flags: moderation.flags,
      status: "completed",
    },
  };
}

async function loadArticleContext(articleId: string): Promise<{
  article: GeneratedArticleRow;
  event: NewsEventRow | null;
  signals: NewsSignalRow[];
} | null> {
  const supabase = createAdminServerClient();

  const { data: article, error } = await supabase
    .from("generated_articles")
    .select("*")
    .eq("id", articleId)
    .single();

  if (error || !article) return null;

  let event: NewsEventRow | null = null;
  let signals: NewsSignalRow[] = [];

  if (article.event_id) {
    const { data: ev } = await supabase
      .from("news_events")
      .select("*")
      .eq("id", article.event_id)
      .single();
    event = ev ?? null;

    if (event?.signal_ids?.length) {
      const { data: sigs } = await supabase
        .from("news_signals")
        .select("*")
        .in("id", event.signal_ids);
      signals = sigs ?? [];
    }
  }

  return { article, event, signals };
}

async function processQueueItem(
  row: EditorialImageQueueRow
): Promise<{ ok: boolean; error?: string }> {
  const ctx = await loadArticleContext(row.generated_article_id);
  if (!ctx) {
    return { ok: false, error: "article_not_found" };
  }

  const { article, event, signals } = ctx;
  const category = event?.category ?? article.tags[0] ?? "world";

  try {
    const resolved = await resolveEditorialHeroImage({
      headline: article.headline,
      category,
      region: event?.region ?? null,
      urgencyScore: event?.urgency_score ?? 50,
      eventSummary: event?.event_summary ?? article.summary,
      slug: article.slug,
      signals,
      skipAi: !isEditorialImageGenerationEnabled(),
    });

    await markEditorialImageCompleted({
      queueId: row.id,
      generatedArticleId: article.id,
      heroImageUrl: resolved.hero_image_url,
      ogImageUrl: resolved.og_image_url,
      imageSource: resolved.source,
      promptHash: resolved.metadata.prompt_hash ?? null,
    });

    logImage("queue_item_complete", {
      articleId: article.id,
      source: resolved.source,
    });

    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "process_failed";
    const categoryFallback = resolveCategoryFallbackHero(category);
    const sourceImage = signals.length ? pickSourceSignalImage(signals) : null;
    const fallback = sourceImage ?? categoryFallback;
    const retry = row.attempts + 1 < row.max_attempts;

    await markEditorialImageFailed({
      queueId: row.id,
      generatedArticleId: article.id,
      attempts: row.attempts,
      maxAttempts: row.max_attempts,
      error: msg,
      retry,
      fallbackHeroUrl: retry ? undefined : fallback,
      fallbackOgUrl: retry ? undefined : buildOpenGraphImageUrl(fallback),
      imageSource: retry ? undefined : sourceImage ? "source_extracted" : "category_fallback",
    });

    return { ok: false, error: msg };
  }
}

/**
 * Process pending editorial image queue (retries built-in).
 */
export async function processEditorialImageQueue(
  limit = 5
): Promise<ProcessEditorialImageQueueResult> {
  const batch = await claimEditorialImageBatch(limit);
  if (!batch.length) {
    return { processed: 0, completed: 0, failed: 0, skipped: 0, errors: [] };
  }

  let completed = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const row of batch) {
    const result = await processQueueItem(row);
    if (result.ok) completed++;
    else {
      failed++;
      if (result.error) errors.push(`${row.generated_article_id}: ${result.error}`);
    }
  }

  logImage("queue_batch_complete", { completed, failed, processed: batch.length });

  return {
    processed: batch.length,
    completed,
    failed,
    skipped: 0,
    errors,
  };
}

/** Queue hero image generation after article insert */
export async function queueEditorialImageForArticle(
  generatedArticleId: string
): Promise<void> {
  const queued = await enqueueEditorialImage(generatedArticleId);
  if (queued) {
    logImage("enqueued", {
      generatedArticleId,
      aiEnabled: isEditorialImageGenerationEnabled(),
    });
  }
}

/** Immediate category placeholder while queue processes */
export function initialHeroPlaceholder(category: string): string {
  return resolveCategoryFallbackHero(category);
}

export {
  enqueueEditorialImage,
  countPendingEditorialImages,
} from "@/lib/news/ai/editorial-image-queue";
