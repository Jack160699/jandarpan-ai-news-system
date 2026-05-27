/**
 * Premium AI editorial image pipeline — contextual visuals, quality gates, analytics
 *
 * Fallback hierarchy:
 * 1. AI-generated branded illustration (quality-scored, deduplicated)
 * 2. Visual-hash duplicate reuse
 * 3. Prompt-hash duplicate reuse
 * 4. Quality-scored source signal image
 * 5. Region + category curated Unsplash editorial art
 * 6. Branded CG Bhaskar placeholder
 */

import { createAdminServerClient } from "@/lib/supabase";
import { getPublicSupabaseEnv } from "@/lib/supabase/env";
import { scoreSourceConfidence } from "@/lib/news/ai/event-clustering";
import { logEditorialImageAnalytics } from "@/lib/news/ai/editorial-image-analytics";
import {
  buildEditorialImagePrompt,
  hashImagePrompt,
  moderateEditorialImageContext,
  moderateGeneratedPrompt,
} from "@/lib/news/ai/editorial-image-moderation";
import {
  buildOpenGraphImageUrl,
  buildResponsiveSizes,
  compressEditorialImage,
  getImageCacheControl,
  optimizeCdnImageUrl,
} from "@/lib/news/ai/editorial-image-compress";
import {
  claimEditorialImageBatch,
  enqueueEditorialImage,
  findDuplicateImageByPromptHash,
  findDuplicateImageByVisualHash,
  markEditorialImageCompletedWithMeta,
  markEditorialImageFailed,
  type EditorialImageQueueRow,
} from "@/lib/news/ai/editorial-image-queue";
import { buildRepairPromptVariant } from "@/lib/news/ai/editorial-image-repair";
import {
  isNearDuplicateVisual,
  scoreImageBuffer,
} from "@/lib/news/ai/editorial-image-quality";
import { resolveContextualFallback } from "@/lib/news/images/editorial-visual-fallbacks";
import { isDisplayableImage } from "@/lib/news/images/validate";
import { logNewsroom } from "@/lib/newsroom/logger";
import type {
  GeneratedArticleRow,
  NewsEventRow,
  NewsSignalRow,
} from "@/lib/types/newsroom";

const OPENAI_IMAGES_URL = "https://api.openai.com/v1/images/generations";
const IMAGE_TIMEOUT_MS = 45_000;
const MAX_AI_REPAIR_ATTEMPTS = 2;

export type EditorialImageSource =
  | "ai_generated"
  | "source_extracted"
  | "category_curated"
  | "region_curated"
  | "branded_placeholder"
  | "duplicate_reuse"
  | "duplicate_visual_reuse";

export type EditorialImageMetadata = {
  source: EditorialImageSource;
  hero_url: string;
  og_url: string;
  prompt_hash?: string | null;
  visual_hash?: string | null;
  prompt?: string | null;
  moderation_flags?: string[];
  quality_score?: number;
  quality_flags?: string[];
  status?: "queued" | "completed" | "failed" | "repaired";
  compressed?: boolean;
  storage_path?: string | null;
  width?: number;
  height?: number;
  mobile_width?: number;
  mobile_height?: number;
  responsive_sizes?: string;
  fallback_tier?: string;
  processed_at?: string;
  repair_attempts?: number;
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

export function resolveCategoryFallbackHero(
  category: string,
  region?: string | null
): string {
  return resolveContextualFallback({ category, region }).url;
}

async function downloadImageBuffer(url: string): Promise<Buffer | null> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(12_000),
      headers: { Accept: "image/*" },
      next: { revalidate: 3600 },
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
  const cacheControl = getImageCacheControl();

  const heroPath = `${basePath}-hero.webp`;
  const ogPath = `${basePath}-og.webp`;

  const heroUp = await supabase.storage.from(bucket).upload(heroPath, input.hero, {
    contentType: "image/webp",
    cacheControl,
    upsert: true,
  });

  if (heroUp.error) {
    logEditorialImageAnalytics({
      event: "storage_upload_fail",
      error: heroUp.error.message,
      metadata: { path: heroPath },
    });
    return null;
  }

  const ogUp = await supabase.storage.from(bucket).upload(ogPath, input.og, {
    contentType: "image/webp",
    cacheControl,
    upsert: true,
  });

  if (ogUp.error) {
    logEditorialImageAnalytics({
      event: "storage_upload_fail",
      error: ogUp.error.message,
      metadata: { path: ogPath },
    });
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

  logEditorialImageAnalytics({
    event: "storage_upload_ok",
    metadata: { heroPath, ogPath },
  });

  return { heroUrl, ogUrl, heroPath };
}

async function generateOpenAiIllustration(
  prompt: string
): Promise<Buffer | null> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return null;

  const promptCheck = moderateGeneratedPrompt(prompt);
  if (!promptCheck.safe) {
    logEditorialImageAnalytics({
      event: "ai_generate_fail",
      error: "prompt_moderation_blocked",
      qualityFlags: promptCheck.flags,
    });
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
    data?: Array<{ url?: string }>;
  };

  const imageUrl = json.data?.[0]?.url;
  if (!imageUrl) return null;

  return downloadImageBuffer(imageUrl);
}

function buildFallbackResult(input: {
  url: string;
  source: EditorialImageSource;
  moderationFlags: string[];
  fallbackTier: string;
  qualityScore?: number;
}): ResolveEditorialImageResult {
  const og = buildOpenGraphImageUrl(input.url);
  logEditorialImageAnalytics({
    event: "fallback_applied",
    source: input.source,
    fallbackTier: 5,
    qualityScore: input.qualityScore,
    metadata: { tier: input.fallbackTier },
  });

  return {
    hero_image_url: input.url,
    og_image_url: og,
    source: input.source,
    metadata: {
      source: input.source,
      hero_url: input.url,
      og_url: og,
      moderation_flags: input.moderationFlags,
      quality_score: input.qualityScore,
      fallback_tier: input.fallbackTier,
      responsive_sizes: buildResponsiveSizes(),
      status: "completed",
      processed_at: new Date().toISOString(),
    },
  };
}

async function trySourceImageWithQuality(
  sourceUrl: string,
  moderationFlags: string[]
): Promise<ResolveEditorialImageResult | null> {
  const buf = await downloadImageBuffer(sourceUrl);
  if (!buf) return null;

  const quality = await scoreImageBuffer(buf, { minScore: 0.45 });
  if (!quality.passed) {
    logEditorialImageAnalytics({
      event: "quality_reject",
      source: "source_extracted",
      qualityScore: quality.score,
      qualityFlags: quality.flags,
    });
    return null;
  }

  logEditorialImageAnalytics({
    event: "quality_pass",
    source: "source_extracted",
    qualityScore: quality.score,
    visualHash: quality.visualHash,
    width: quality.width,
    height: quality.height,
    bytes: quality.bytes,
  });

  return buildFallbackResult({
    url: sourceUrl,
    source: "source_extracted",
    moderationFlags,
    fallbackTier: "source_quality_pass",
    qualityScore: quality.score,
  });
}

/**
 * Resolve hero image with full premium hierarchy.
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
  articleId?: string;
}): Promise<ResolveEditorialImageResult> {
  const started = Date.now();
  logEditorialImageAnalytics({
    event: "resolve_start",
    articleId: input.articleId,
    slug: input.slug,
    category: input.category,
    region: input.region,
  });

  const moderation = moderateEditorialImageContext({
    headline: input.headline,
    eventSummary: input.eventSummary,
    category: input.category,
  });

  const contextual = resolveContextualFallback({
    category: input.category,
    region: input.region,
  });
  const sourceImageUrl = input.signals?.length
    ? pickSourceSignalImage(input.signals)
    : null;

  if (!isEditorialImageGenerationEnabled() || input.skipAi || !moderation.allowed) {
    const sourceResult = sourceImageUrl
      ? await trySourceImageWithQuality(sourceImageUrl, moderation.flags)
      : null;
    if (sourceResult) {
      logEditorialImageAnalytics({
        event: "resolve_complete",
        source: sourceResult.source,
        latencyMs: Date.now() - started,
      });
      return sourceResult;
    }
    const result = buildFallbackResult({
      url: contextual.url,
      source:
        contextual.tier === "region_curated"
          ? "region_curated"
          : "category_curated",
      moderationFlags: moderation.flags,
      fallbackTier: contextual.fallbackKey,
    });
    logEditorialImageAnalytics({
      event: "resolve_complete",
      source: result.source,
      latencyMs: Date.now() - started,
    });
    return result;
  }

  const basePrompt = buildEditorialImagePrompt({
    headline: input.headline,
    category: input.category,
    region: input.region,
    urgencyScore: input.urgencyScore,
    eventSummary: input.eventSummary,
    moderation,
  });

  const promptHash = hashImagePrompt(basePrompt);

  const promptDuplicate = await findDuplicateImageByPromptHash(promptHash);
  if (promptDuplicate) {
    logEditorialImageAnalytics({
      event: "duplicate_prompt_reuse",
      promptHash,
    });
    const og =
      promptDuplicate.og_image_url ??
      buildOpenGraphImageUrl(promptDuplicate.hero_image_url);
    const result: ResolveEditorialImageResult = {
      hero_image_url: promptDuplicate.hero_image_url,
      og_image_url: og,
      source: "duplicate_reuse",
      metadata: {
        source: "duplicate_reuse",
        hero_url: promptDuplicate.hero_image_url,
        og_url: og,
        prompt_hash: promptHash,
        responsive_sizes: buildResponsiveSizes(),
        status: "completed",
        processed_at: new Date().toISOString(),
      },
    };
    logEditorialImageAnalytics({
      event: "resolve_complete",
      source: "duplicate_reuse",
      latencyMs: Date.now() - started,
    });
    return result;
  }

  for (let attempt = 0; attempt <= MAX_AI_REPAIR_ATTEMPTS; attempt++) {
    const prompt =
      attempt === 0
        ? basePrompt
        : buildRepairPromptVariant({
            basePrompt,
            attempt,
            category: input.category,
            region: input.region,
            moderation,
          });

    if (attempt > 0) {
      logEditorialImageAnalytics({
        event: "repair_attempt",
        articleId: input.articleId,
        metadata: { attempt },
      });
    }

    logEditorialImageAnalytics({ event: "ai_generate_start", promptHash });

    try {
      const rawBuffer = await generateOpenAiIllustration(prompt);
      if (!rawBuffer) throw new Error("ai_generation_empty");

      const quality = await scoreImageBuffer(rawBuffer);
      if (!quality.passed) {
        logEditorialImageAnalytics({
          event: "quality_reject",
          qualityScore: quality.score,
          qualityFlags: quality.flags,
          metadata: { attempt },
        });
        continue;
      }

      const visualDup = await findDuplicateImageByVisualHash(
        quality.visualHash,
        isNearDuplicateVisual
      );
      if (visualDup) {
        logEditorialImageAnalytics({
          event: "duplicate_visual_reuse",
          visualHash: quality.visualHash,
          metadata: { matched: visualDup.matchedHash },
        });
        const og =
          visualDup.og_image_url ??
          buildOpenGraphImageUrl(visualDup.hero_image_url);
        return {
          hero_image_url: visualDup.hero_image_url,
          og_image_url: og,
          source: "duplicate_visual_reuse",
          metadata: {
            source: "duplicate_visual_reuse",
            hero_url: visualDup.hero_image_url,
            og_url: og,
            visual_hash: quality.visualHash,
            quality_score: quality.score,
            responsive_sizes: buildResponsiveSizes(),
            status: "completed",
            processed_at: new Date().toISOString(),
          },
        };
      }

      logEditorialImageAnalytics({
        event: "quality_pass",
        qualityScore: quality.score,
        visualHash: quality.visualHash,
        width: quality.width,
        height: quality.height,
      });

      const compressed = await compressEditorialImage(rawBuffer);
      const uploaded = await uploadEditorialVariants({
        slug: input.slug,
        promptHash,
        hero: compressed.hero,
        og: compressed.og,
      });

      if (uploaded) {
        logEditorialImageAnalytics({
          event: "ai_generate_ok",
          source: "ai_generated",
          qualityScore: quality.score,
          latencyMs: Date.now() - started,
        });

        const result: ResolveEditorialImageResult = {
          hero_image_url: uploaded.heroUrl,
          og_image_url: uploaded.ogUrl,
          source: "ai_generated",
          metadata: {
            source: "ai_generated",
            hero_url: uploaded.heroUrl,
            og_url: uploaded.ogUrl,
            prompt_hash: promptHash,
            visual_hash: quality.visualHash,
            prompt: prompt.slice(0, 500),
            moderation_flags: moderation.flags,
            quality_score: quality.score,
            quality_flags: quality.flags,
            compressed: true,
            storage_path: uploaded.heroPath,
            width: compressed.heroWidth,
            height: compressed.heroHeight,
            mobile_width: compressed.mobileWidth,
            mobile_height: compressed.mobileHeight,
            responsive_sizes: buildResponsiveSizes(),
            status: attempt > 0 ? "repaired" : "completed",
            repair_attempts: attempt,
            processed_at: new Date().toISOString(),
          },
        };

        logEditorialImageAnalytics({
          event: "resolve_complete",
          source: "ai_generated",
          qualityScore: quality.score,
          latencyMs: Date.now() - started,
        });
        return result;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "ai_image_failed";
      logEditorialImageAnalytics({
        event: "ai_generate_fail",
        error: msg,
        metadata: { attempt },
      });
    }
  }

  if (sourceImageUrl) {
    const sourceResult = await trySourceImageWithQuality(
      sourceImageUrl,
      moderation.flags
    );
    if (sourceResult) {
      logEditorialImageAnalytics({
        event: "resolve_complete",
        source: "source_extracted",
        latencyMs: Date.now() - started,
      });
      return sourceResult;
    }
  }

  const result = buildFallbackResult({
    url: contextual.url,
    source:
      contextual.tier === "region_curated"
        ? "region_curated"
        : "category_curated",
    moderationFlags: moderation.flags,
    fallbackTier: contextual.fallbackKey,
  });

  logEditorialImageAnalytics({
    event: "resolve_complete",
    source: result.source,
    latencyMs: Date.now() - started,
  });
  return result;
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

  return {
    article: article as unknown as GeneratedArticleRow,
    event: event as unknown as NewsEventRow | null,
    signals: signals as unknown as NewsSignalRow[],
  };
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
      articleId: article.id,
    });

    await markEditorialImageCompletedWithMeta({
      queueId: row.id,
      generatedArticleId: article.id,
      heroImageUrl: resolved.hero_image_url,
      ogImageUrl: resolved.og_image_url,
      imageSource: resolved.source,
      promptHash: resolved.metadata.prompt_hash ?? null,
      imageMeta: resolved.metadata,
    });

    logEditorialImageAnalytics({
      event: "queue_item_complete",
      articleId: article.id,
      source: resolved.source,
      qualityScore: resolved.metadata.quality_score,
    });

    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "process_failed";
    const contextual = resolveContextualFallback({
      category,
      region: event?.region ?? null,
    });
    const sourceImage = signals.length ? pickSourceSignalImage(signals) : null;
    const fallback = sourceImage ?? contextual.url;
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
      imageSource: retry
        ? undefined
        : sourceImage
          ? "source_extracted"
          : "category_curated",
    });

    return { ok: false, error: msg };
  }
}

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

  logEditorialImageAnalytics({
    event: "queue_batch_complete",
    metadata: { completed, failed, processed: batch.length },
  });

  return {
    processed: batch.length,
    completed,
    failed,
    skipped: 0,
    errors,
  };
}

export async function queueEditorialImageForArticle(
  generatedArticleId: string
): Promise<void> {
  const queued = await enqueueEditorialImage(generatedArticleId);
  if (queued) {
    logEditorialImageAnalytics({
      event: "resolve_start",
      articleId: generatedArticleId,
      metadata: { enqueued: true, aiEnabled: isEditorialImageGenerationEnabled() },
    });
  }
}

export function initialHeroPlaceholder(
  category: string,
  region?: string | null
): string {
  return resolveContextualFallback({ category, region }).url;
}

export {
  enqueueEditorialImage,
  countPendingEditorialImages,
} from "@/lib/news/ai/editorial-image-queue";
