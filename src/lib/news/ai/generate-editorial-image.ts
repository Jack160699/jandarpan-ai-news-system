/**
 * Production AI editorial image pipeline — contextual prompts, quality gates, metrics
 *
 * Pipeline:
 * Article → Context Builder → Prompt Builder → Provider → Quality → Retry → Storage → CDN
 */

import { requestImageGeneration } from "@/lib/ai/providers";
import { createAdminServerClient } from "@/lib/supabase";
import { getPublicSupabaseEnv } from "@/lib/supabase/env";
import { scoreSourceConfidence } from "@/lib/news/ai/event-clustering";
import { logEditorialImageAnalytics } from "@/lib/news/ai/editorial-image-analytics";
import {
  buildEditorialImageContext,
  type EditorialImageContext,
} from "@/lib/news/ai/editorial-image-context";
import { logGenerationAttempt } from "@/lib/news/ai/editorial-image-history";
import { incrementImageMetrics } from "@/lib/news/ai/editorial-image-metrics";
import {
  moderateEditorialImageContext,
  moderateGeneratedPrompt,
} from "@/lib/news/ai/editorial-image-moderation";
import {
  buildIntelligentEditorialPrompt,
  buildRetryPromptVariant,
  hashImagePrompt,
} from "@/lib/news/ai/editorial-image-prompt-builder";
import {
  isImageProviderAvailable,
  selectImageProvider,
} from "@/lib/news/ai/editorial-image-provider";
import {
  buildOpenGraphImageUrl,
  buildResponsiveSizes,
  compressEditorialImage,
  getImageCacheControl,
  optimizeCdnImageUrl,
} from "@/lib/news/ai/editorial-image-compress";
import {
  appendRetryLog,
  claimEditorialImageBatch,
  enqueueEditorialImage,
  findDuplicateImageByPromptHash,
  findDuplicateImageByVisualHash,
  getQueueRowForArticle,
  markEditorialImageCompletedWithMeta,
  markEditorialImageFailed,
  releaseEditorialImageBatch,
  type EditorialImageQueueRow,
} from "@/lib/news/ai/editorial-image-queue";
import type { ExecutionDeadline } from "@/lib/serverless/deadline";
import { INFRA_CONFIG } from "@/lib/infrastructure/config";
import { recordQueueFailure } from "@/lib/infrastructure/queue/failure-record";
import {
  isNearDuplicateVisual,
  scoreImageBuffer,
} from "@/lib/news/ai/editorial-image-quality";
import { getRetryConfig } from "@/lib/news/ai/editorial-image-retry";
import { resolveContextualFallback } from "@/lib/news/images/editorial-visual-fallbacks";
import { isDisplayableImage } from "@/lib/news/images/validate";
import { logNewsroom } from "@/lib/newsroom/logger";
import type {
  GeneratedArticleRow,
  NewsEventRow,
  NewsSignalRow,
} from "@/lib/types/newsroom";

export type EditorialImageSource =
  | "ai_generated"
  | "source_extracted"
  | "category_curated"
  | "region_curated"
  | "branded_placeholder"
  | "duplicate_reuse"
  | "duplicate_visual_reuse"
  | "manual_replace";

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
  theme?: string;
  district?: string | null;
  provider?: string;
  model?: string;
  approval_status?: string;
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
  retried?: number;
  skipped: number;
  errors: string[];
  partial?: boolean;
  released?: number;
};

export type EditorialImageProcessOptions = {
  deadline?: ExecutionDeadline;
  concurrency?: number;
  promptHashCache?: Map<string, { hero_image_url: string; og_image_url: string | null }>;
};

function logImage(message: string, context?: Record<string, unknown>): void {
  logNewsroom("editorial-image", message, context);
}

function logImageGenerationPhase(
  phase:
    | "image_generation_started"
    | "image_generation_completed"
    | "image_generation_failed",
  context: Record<string, unknown>
): void {
  console.log(
    JSON.stringify({
      tag: "[ai-pipeline]",
      phase,
      ts: new Date().toISOString(),
      ...context,
    })
  );
}

export function isEditorialImageGenerationEnabled(): boolean {
  return isImageProviderAvailable();
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
    if (!res.ok) {
      logImage("download_fail", { url: url.slice(0, 120), httpStatus: res.status });
      return null;
    }
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length <= 1024) {
      logImage("download_fail", { url: url.slice(0, 120), reason: "buffer_too_small", bytes: buf.length });
      return null;
    }
    return buf;
  } catch (err) {
    const msg = err instanceof Error ? err.message : "download_failed";
    logImage("download_fail", { url: url.slice(0, 120), error: msg });
    return null;
  }
}

async function uploadEditorialVariants(input: {
  slug: string;
  promptHash: string;
  hero: Buffer;
  og: Buffer;
  mobile?: Buffer;
}): Promise<{ heroUrl: string; ogUrl: string; mobileUrl?: string; heroPath: string } | null> {
  const supabase = createAdminServerClient();
  const bucket = getStorageBucket();
  const basePath = `${input.slug.slice(0, 80)}/${input.promptHash}`;
  const cacheControl = getImageCacheControl();

  const heroPath = `${basePath}-hero.webp`;
  const ogPath = `${basePath}-og.webp`;
  const mobilePath = `${basePath}-mobile.webp`;

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

  const [ogUp] = await Promise.all([
    supabase.storage.from(bucket).upload(ogPath, input.og, {
      contentType: "image/webp",
      cacheControl,
      upsert: true,
    }),
    input.mobile
      ? supabase.storage.from(bucket).upload(mobilePath, input.mobile, {
          contentType: "image/webp",
          cacheControl,
          upsert: true,
        })
      : Promise.resolve({ error: null }),
  ]);

  const { url: supabaseUrl } = getPublicSupabaseEnv();
  const heroPub = supabase.storage.from(bucket).getPublicUrl(heroPath);
  const ogPub = supabase.storage.from(bucket).getPublicUrl(ogPath);
  const mobilePub = input.mobile
    ? supabase.storage.from(bucket).getPublicUrl(mobilePath)
    : null;

  const heroUrl =
    heroPub.data.publicUrl ||
    `${supabaseUrl}/storage/v1/object/public/${bucket}/${heroPath}`;
  const ogUrl = ogUp.error
    ? heroUrl
    : ogPub.data.publicUrl ||
      `${supabaseUrl}/storage/v1/object/public/${bucket}/${ogPath}`;
  const mobileUrl = mobilePub?.data.publicUrl;

  logEditorialImageAnalytics({
    event: "storage_upload_ok",
    metadata: { heroPath, ogPath, mobilePath: input.mobile ? mobilePath : null },
  });

  return { heroUrl, ogUrl, mobileUrl, heroPath };
}

async function generateAiIllustration(input: {
  prompt: string;
  articleId?: string;
  queueId?: string;
  attemptNumber: number;
}): Promise<{
  buffer: Buffer | null;
  provider: string;
  model: string;
  latencyMs: number;
  error?: string;
  httpStatus?: number;
}> {
  const providerConfig = selectImageProvider();
  const started = Date.now();

  const promptCheck = moderateGeneratedPrompt(input.prompt);
  if (!promptCheck.safe) {
    await logGenerationAttempt({
      queueId: input.queueId,
      generatedArticleId: input.articleId ?? "unknown",
      attemptNumber: input.attemptNumber,
      provider: providerConfig.id,
      model: providerConfig.model,
      prompt: input.prompt,
      status: "failed",
      error: "prompt_moderation_blocked",
      metadata: { flags: promptCheck.flags },
    });
    return {
      buffer: null,
      provider: providerConfig.id,
      model: providerConfig.model,
      latencyMs: Date.now() - started,
      error: "prompt_moderation_blocked",
    };
  }

  const extraBody: Record<string, unknown> = {};
  if (providerConfig.quality) extraBody.quality = providerConfig.quality;
  if (providerConfig.style) extraBody.style = providerConfig.style;

  await logGenerationAttempt({
    queueId: input.queueId,
    generatedArticleId: input.articleId ?? "unknown",
    attemptNumber: input.attemptNumber,
    provider: providerConfig.id,
    model: providerConfig.model,
    prompt: input.prompt,
    promptHash: hashImagePrompt(input.prompt),
    status: "started",
  });

  const result = await requestImageGeneration({
    operation: "editorial_image",
    prompt: input.prompt,
    model: providerConfig.model,
    size: providerConfig.size,
    timeoutMs: providerConfig.timeoutMs,
    extraBody,
    context: {
      worker: "editorial_images",
      articleId: input.articleId ?? undefined,
    },
  });

  const latencyMs = Date.now() - started;

  if ("error" in result) {
    await incrementImageMetrics({ providerError: true });
    await logGenerationAttempt({
      queueId: input.queueId,
      generatedArticleId: input.articleId ?? "unknown",
      attemptNumber: input.attemptNumber,
      provider: providerConfig.id,
      model: providerConfig.model,
      prompt: input.prompt,
      status: "failed",
      latencyMs,
      error: result.error.message,
      metadata: { code: result.error.code },
    });
    logEditorialImageAnalytics({
      event: "ai_generate_fail",
      error: result.error.message,
      metadata: {
        code: result.error.code,
        httpStatus: result.error.httpStatus ?? null,
        retryable: result.error.retryable,
      },
    });
    return {
      buffer: null,
      provider: providerConfig.id,
      model: providerConfig.model,
      latencyMs,
      error: result.error.message,
      httpStatus: result.error.httpStatus,
    };
  }

  const downloadStarted = Date.now();
  const buffer = await downloadImageBuffer(result.url);
  if (!buffer) {
    await incrementImageMetrics({ providerError: true });
    const downloadError = "openai_image_download_failed";
    await logGenerationAttempt({
      queueId: input.queueId,
      generatedArticleId: input.articleId ?? "unknown",
      attemptNumber: input.attemptNumber,
      provider: providerConfig.id,
      model: providerConfig.model,
      prompt: input.prompt,
      status: "failed",
      latencyMs: Date.now() - started,
      error: downloadError,
    });
    return {
      buffer: null,
      provider: providerConfig.id,
      model: providerConfig.model,
      latencyMs: Date.now() - started,
      error: downloadError,
      httpStatus: 200,
    };
  }

  logImage("download_ok", { downloadMs: Date.now() - downloadStarted, bytes: buffer.length });
  return { buffer, provider: providerConfig.id, model: providerConfig.model, latencyMs };
}

function buildFallbackResult(input: {
  url: string;
  source: EditorialImageSource;
  moderationFlags: string[];
  fallbackTier: string;
  qualityScore?: number;
  context?: EditorialImageContext;
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
      theme: input.context?.theme,
      district: input.context?.location.district,
      processed_at: new Date().toISOString(),
    },
  };
}

async function trySourceImageWithQuality(
  sourceUrl: string,
  moderationFlags: string[],
  context?: EditorialImageContext
): Promise<ResolveEditorialImageResult | null> {
  const buf = await downloadImageBuffer(sourceUrl);
  if (!buf) return null;

  const quality = await scoreImageBuffer(buf, {
    minScore: 0.48,
    contextKeywords: context?.entities.keywords,
  });
  if (!quality.passed) {
    logEditorialImageAnalytics({
      event: "quality_reject",
      source: "source_extracted",
      qualityScore: quality.score,
      qualityFlags: quality.flags,
    });
    await incrementImageMetrics({ qualityRejection: true });
    return null;
  }

  return buildFallbackResult({
    url: sourceUrl,
    source: "source_extracted",
    moderationFlags,
    fallbackTier: "source_quality_pass",
    qualityScore: quality.score,
    context,
  });
}

/**
 * Resolve hero image with full production hierarchy.
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
  queueId?: string;
  article?: GeneratedArticleRow;
  event?: NewsEventRow | null;
  customPrompt?: string | null;
  promptHashCache?: Map<string, { hero_image_url: string; og_image_url: string | null }>;
}): Promise<ResolveEditorialImageResult> {
  const started = Date.now();
  const retryConfig = getRetryConfig();

  const imageContext = input.article
    ? buildEditorialImageContext({
        article: input.article,
        event: input.event ?? null,
        signals: input.signals,
        customPrompt: input.customPrompt,
      })
    : buildEditorialImageContext({
        article: {
          id: input.articleId ?? "",
          headline: input.headline,
          summary: input.eventSummary,
          article_body: null,
          slug: input.slug,
          tags: [input.category],
        } as GeneratedArticleRow,
        event: {
          category: input.category,
          region: input.region,
          urgency_score: input.urgencyScore,
          event_summary: input.eventSummary,
        } as NewsEventRow,
        signals: input.signals,
        customPrompt: input.customPrompt,
      });

  logEditorialImageAnalytics({
    event: "resolve_start",
    articleId: input.articleId,
    slug: input.slug,
    category: input.category,
    region: input.region,
    metadata: {
      theme: imageContext.theme,
      district: imageContext.location.district,
    },
  });

  const moderation = moderateEditorialImageContext({
    headline: input.headline,
    eventSummary: input.eventSummary ?? imageContext.summary,
    category: input.category,
  });

  const contextual = resolveContextualFallback({
    category: input.category,
    region: input.region ?? imageContext.location.state,
  });
  const sourceImageUrl = input.signals?.length
    ? pickSourceSignalImage(input.signals)
    : null;

  if (!isEditorialImageGenerationEnabled() || input.skipAi || !moderation.allowed) {
    const sourceResult = sourceImageUrl
      ? await trySourceImageWithQuality(sourceImageUrl, moderation.flags, imageContext)
      : null;
    if (sourceResult) {
      await incrementImageMetrics({
        completed: true,
        fallbackUsed: true,
        latencyMs: Date.now() - started,
        qualityScore: sourceResult.metadata.quality_score,
      });
      return sourceResult;
    }
    const result = buildFallbackResult({
      url: contextual.url,
      source:
        contextual.tier === "region_curated" ? "region_curated" : "category_curated",
      moderationFlags: moderation.flags,
      fallbackTier: contextual.fallbackKey,
      context: imageContext,
    });
    await incrementImageMetrics({ completed: true, fallbackUsed: true, latencyMs: Date.now() - started });
    return result;
  }

  const basePrompt = buildIntelligentEditorialPrompt({
    context: imageContext,
    moderation,
  });
  const promptHash = hashImagePrompt(basePrompt);

  const cachedDup = input.promptHashCache?.get(promptHash);
  const promptDuplicate =
    cachedDup ?? (await findDuplicateImageByPromptHash(promptHash));
  if (promptDuplicate && !cachedDup) {
    input.promptHashCache?.set(promptHash, promptDuplicate);
  }
  if (promptDuplicate) {
    const og =
      promptDuplicate.og_image_url ??
      buildOpenGraphImageUrl(promptDuplicate.hero_image_url);
    await incrementImageMetrics({ completed: true, latencyMs: Date.now() - started });
    return {
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
        theme: imageContext.theme,
        district: imageContext.location.district,
        processed_at: new Date().toISOString(),
      },
    };
  }

  let lastQualityFlags: string[] = [];

  for (let attempt = 0; attempt <= retryConfig.maxRepairAttempts; attempt++) {
    const prompt =
      attempt === 0
        ? basePrompt
        : buildRetryPromptVariant({
            basePrompt,
            attempt,
            context: imageContext,
            qualityFlags: lastQualityFlags,
          });

    if (attempt > 0) {
      logEditorialImageAnalytics({
        event: "repair_attempt",
        articleId: input.articleId,
        metadata: { attempt, flags: lastQualityFlags },
      });
      await incrementImageMetrics({ retried: true });
    }

    const gen = await generateAiIllustration({
      prompt,
      articleId: input.articleId,
      queueId: input.queueId,
      attemptNumber: attempt + 1,
    });

    if (!gen.buffer) continue;

    const quality = await scoreImageBuffer(gen.buffer, {
      contextKeywords: imageContext.entities.keywords,
      promptText: prompt,
    });
    lastQualityFlags = quality.flags;

    if (!quality.passed) {
      await logGenerationAttempt({
        queueId: input.queueId,
        generatedArticleId: input.articleId ?? "unknown",
        attemptNumber: attempt + 1,
        provider: gen.provider,
        model: gen.model,
        prompt,
        promptHash,
        status: "rejected",
        qualityScore: quality.score,
        qualityFlags: quality.flags,
        visualHash: quality.visualHash,
        latencyMs: gen.latencyMs,
      });
      logEditorialImageAnalytics({
        event: "quality_reject",
        qualityScore: quality.score,
        qualityFlags: quality.flags,
        metadata: { attempt },
      });
      await incrementImageMetrics({ qualityRejection: true });
      continue;
    }

    const visualDup = await findDuplicateImageByVisualHash(
      quality.visualHash,
      isNearDuplicateVisual
    );
    if (visualDup) {
      const og =
        visualDup.og_image_url ?? buildOpenGraphImageUrl(visualDup.hero_image_url);
      await incrementImageMetrics({ completed: true, latencyMs: Date.now() - started });
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
          theme: imageContext.theme,
          processed_at: new Date().toISOString(),
        },
      };
    }

    const compressed = await compressEditorialImage(gen.buffer);
    const uploaded = await uploadEditorialVariants({
      slug: input.slug,
      promptHash,
      hero: compressed.hero,
      og: compressed.og,
      mobile: compressed.mobile,
    });

    if (uploaded) {
      await logGenerationAttempt({
        queueId: input.queueId,
        generatedArticleId: input.articleId ?? "unknown",
        attemptNumber: attempt + 1,
        provider: gen.provider,
        model: gen.model,
        prompt,
        promptHash,
        status: "completed",
        qualityScore: quality.score,
        qualityFlags: quality.flags,
        heroImageUrl: uploaded.heroUrl,
        ogImageUrl: uploaded.ogUrl,
        visualHash: quality.visualHash,
        latencyMs: gen.latencyMs,
      });

      await incrementImageMetrics({
        completed: true,
        aiGenerated: true,
        latencyMs: Date.now() - started,
        qualityScore: quality.score,
      });

      return {
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
          theme: imageContext.theme,
          district: imageContext.location.district,
          provider: gen.provider,
          model: gen.model,
          processed_at: new Date().toISOString(),
        },
      };
    }
  }

  if (sourceImageUrl) {
    const sourceResult = await trySourceImageWithQuality(
      sourceImageUrl,
      moderation.flags,
      imageContext
    );
    if (sourceResult) {
      await incrementImageMetrics({
        completed: true,
        fallbackUsed: true,
        latencyMs: Date.now() - started,
      });
      return sourceResult;
    }
  }

  const result = buildFallbackResult({
    url: contextual.url,
    source:
      contextual.tier === "region_curated" ? "region_curated" : "category_curated",
    moderationFlags: moderation.flags,
    fallbackTier: contextual.fallbackKey,
    context: imageContext,
  });
  await incrementImageMetrics({
    completed: true,
    fallbackUsed: true,
    latencyMs: Date.now() - started,
  });
  return result;
}

async function batchLoadArticleContexts(
  articleIds: string[]
): Promise<
  Map<
    string,
    {
      article: GeneratedArticleRow;
      event: NewsEventRow | null;
      signals: NewsSignalRow[];
      queueRow: EditorialImageQueueRow | null;
    }
  >
> {
  const result = new Map<
    string,
    {
      article: GeneratedArticleRow;
      event: NewsEventRow | null;
      signals: NewsSignalRow[];
      queueRow: EditorialImageQueueRow | null;
    }
  >();
  if (!articleIds.length) return result;

  const supabase = createAdminServerClient();
  const [articlesRes, queueRows] = await Promise.all([
    supabase.from("generated_articles").select("*").in("id", articleIds),
    Promise.all(articleIds.map((id) => getQueueRowForArticle(id))),
  ]);

  const articles = articlesRes.data ?? [];
  const eventIds = [
    ...new Set(
      articles.map((a) => a.event_id).filter((id): id is string => Boolean(id))
    ),
  ];

  let events: NewsEventRow[] = [];
  if (eventIds.length) {
    const { data } = await supabase.from("news_events").select("*").in("id", eventIds);
    events = (data ?? []) as unknown as NewsEventRow[];
  }

  const eventMap = new Map(events.map((e) => [e.id, e]));
  const allSignalIds = [
    ...new Set(events.flatMap((e) => e.signal_ids ?? [])),
  ];
  let signals: NewsSignalRow[] = [];
  if (allSignalIds.length) {
    const { data } = await supabase
      .from("news_signals")
      .select("*")
      .in("id", allSignalIds);
    signals = (data ?? []) as unknown as NewsSignalRow[];
  }
  const signalMap = new Map(signals.map((s) => [s.id, s]));

  for (let i = 0; i < articles.length; i++) {
    const article = articles[i] as unknown as GeneratedArticleRow;
    const event = article.event_id ? eventMap.get(article.event_id) ?? null : null;
    const articleSignals = event?.signal_ids?.length
      ? event.signal_ids
          .map((id) => signalMap.get(id))
          .filter((s): s is NewsSignalRow => Boolean(s))
      : [];
    result.set(article.id, {
      article,
      event,
      signals: articleSignals,
      queueRow: queueRows[i] ?? null,
    });
  }

  return result;
}

async function loadArticleContext(articleId: string): Promise<{
  article: GeneratedArticleRow;
  event: NewsEventRow | null;
  signals: NewsSignalRow[];
  queueRow: EditorialImageQueueRow | null;
} | null> {
  const supabase = createAdminServerClient();

  const [articleRes, queueRow] = await Promise.all([
    supabase.from("generated_articles").select("*").eq("id", articleId).single(),
    getQueueRowForArticle(articleId),
  ]);

  const article = articleRes.data;
  if (articleRes.error || !article) return null;

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
    queueRow,
  };
}

async function processQueueItem(
  row: EditorialImageQueueRow,
  preloaded?: {
    article: GeneratedArticleRow;
    event: NewsEventRow | null;
    signals: NewsSignalRow[];
    queueRow: EditorialImageQueueRow | null;
  },
  promptHashCache?: Map<string, { hero_image_url: string; og_image_url: string | null }>
): Promise<{ ok: boolean; error?: string; usedFallback?: boolean; retried?: boolean; terminal?: boolean }> {
  logImageGenerationPhase("image_generation_started", {
    queueId: row.id,
    generatedArticleId: row.generated_article_id,
    attempts: row.attempts,
    maxAttempts: row.max_attempts,
  });

  const ctx = preloaded ?? (await loadArticleContext(row.generated_article_id));
  if (!ctx) {
    const error = "article_not_found";
    await markEditorialImageFailed({
      queueId: row.id,
      generatedArticleId: row.generated_article_id,
      attempts: Math.max(0, row.max_attempts - 1),
      maxAttempts: row.max_attempts,
      error,
      retry: false,
    });
    await incrementImageMetrics({ failed: true });
    await recordQueueFailure({
      worker: "editorial_images",
      articleId: row.generated_article_id,
      error,
      category: "database",
      retryCount: row.attempts,
      terminal: true,
    });
    logImageGenerationPhase("image_generation_failed", {
      queueId: row.id,
      generatedArticleId: row.generated_article_id,
      reason: error,
      terminal: true,
      retryCount: row.attempts,
    });
    return { ok: false, error, terminal: true };
  }

  const { article, event, signals, queueRow } = ctx;
  const category = event?.category ?? article.tags[0] ?? "local";

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
      queueId: row.id,
      article,
      event,
      customPrompt: queueRow?.custom_prompt ?? row.custom_prompt,
      promptHashCache,
    });

    const aiFailed =
      isEditorialImageGenerationEnabled() &&
      !["ai_generated", "duplicate_reuse", "duplicate_visual_reuse"].includes(
        resolved.source
      );

    if (aiFailed && row.attempts + 1 < row.max_attempts) {
      const history = appendRetryLog(row.generation_history, {
        attempt: row.attempts + 1,
        reason: "ai_fallback_used",
        promptHash: resolved.metadata.prompt_hash ?? undefined,
      });

      await markEditorialImageFailed({
        queueId: row.id,
        generatedArticleId: article.id,
        attempts: row.attempts,
        maxAttempts: row.max_attempts,
        error: "ai_generation_exhausted_fallback",
        retry: true,
        generationHistory: history,
      });

      await incrementImageMetrics({ retried: true });
      logImageGenerationPhase("image_generation_failed", {
        queueId: row.id,
        generatedArticleId: article.id,
        reason: "ai_fallback_retry_scheduled",
        retry: true,
        retryCount: row.attempts + 1,
      });
      return { ok: false, error: "ai_fallback_retry_scheduled", usedFallback: true, retried: true };
    }

    await markEditorialImageCompletedWithMeta({
      queueId: row.id,
      generatedArticleId: article.id,
      heroImageUrl: resolved.hero_image_url,
      ogImageUrl: resolved.og_image_url,
      imageSource: resolved.source,
      promptHash: resolved.metadata.prompt_hash ?? null,
      imageMeta: resolved.metadata,
    });

    logImageGenerationPhase("image_generation_completed", {
      queueId: row.id,
      generatedArticleId: article.id,
      source: resolved.source,
      qualityScore: resolved.metadata.quality_score ?? null,
      theme: resolved.metadata.theme,
      district: resolved.metadata.district,
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
    const history = appendRetryLog(row.generation_history, {
      attempt: row.attempts + 1,
      reason: msg,
    });

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
      generationHistory: history,
    });

    await incrementImageMetrics({ failed: !retry, retried: retry });
    await recordQueueFailure({
      worker: "editorial_images",
      articleId: article.id,
      error: msg,
      retryCount: row.attempts + 1,
      terminal: !retry,
    });
    logImageGenerationPhase("image_generation_failed", {
      queueId: row.id,
      generatedArticleId: article.id,
      reason: msg,
      retry,
      retryCount: row.attempts + 1,
    });

    return { ok: false, error: msg, retried: retry, terminal: !retry };
  }
}

async function runWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = [];
  let index = 0;

  async function worker(): Promise<void> {
    while (index < items.length) {
      const i = index++;
      results[i] = await fn(items[i]);
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, items.length) }, () =>
    worker()
  );
  await Promise.all(workers);
  return results;
}

export async function processEditorialImageQueue(
  limit = 5,
  options?: EditorialImageProcessOptions
): Promise<ProcessEditorialImageQueueResult> {
  const deadline = options?.deadline;
  const reserveMs = INFRA_CONFIG.workerDeadlineReserveMs;
  const concurrency =
    options?.concurrency ?? INFRA_CONFIG.imageQueueConcurrency;
  const promptHashCache = options?.promptHashCache ?? new Map();

  if (deadline?.shouldStop()) {
    return { processed: 0, completed: 0, failed: 0, retried: 0, skipped: 0, errors: [], partial: true };
  }

  const batch = await claimEditorialImageBatch(limit);
  if (!batch.length) {
    return { processed: 0, completed: 0, failed: 0, retried: 0, skipped: 0, errors: [] };
  }

  const contexts = await batchLoadArticleContexts(
    batch.map((r) => r.generated_article_id)
  );

  let completed = 0;
  let failed = 0;
  let retried = 0;
  let skipped = 0;
  const errors: string[] = [];
  let partial = false;
  let released = 0;
  const toRelease: string[] = [];

  const toProcess: EditorialImageQueueRow[] = [];
  for (const row of batch) {
    if (deadline && !deadline.hasBudgetFor(reserveMs)) {
      toRelease.push(row.id);
      skipped++;
      continue;
    }
    toProcess.push(row);
  }

  const outcomes = await runWithConcurrency(toProcess, concurrency, async (row) => {
    if (deadline?.shouldStop()) {
      return { ok: false, error: "deadline_budget", release: true };
    }
    const preloaded = contexts.get(row.generated_article_id);
    const result = await processQueueItem(row, preloaded, promptHashCache);
    return { ...result, release: false };
  });

  for (let i = 0; i < outcomes.length; i++) {
    const result = outcomes[i];
    const row = toProcess[i];
    if (result.release) {
      toRelease.push(row.id);
      skipped++;
      partial = true;
      continue;
    }
    if (result.ok) completed++;
    else if (result.retried) retried++;
    else {
      failed++;
      if (result.error) errors.push(`${row.generated_article_id}: ${result.error}`);
    }
  }

  if (toRelease.length) {
    released = await releaseEditorialImageBatch([...new Set(toRelease)]);
    partial = true;
  }

  logEditorialImageAnalytics({
    event: "queue_batch_complete",
    metadata: { completed, failed, retried, processed: batch.length, partial, released, concurrency },
  });

  return {
    processed: batch.length - skipped,
    completed,
    failed,
    retried,
    skipped,
    errors,
    partial,
    released,
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
  countProcessingEditorialImages,
} from "@/lib/news/ai/editorial-image-queue";
export { getImageMetricsSnapshot, getImageMetricsHistory } from "@/lib/news/ai/editorial-image-metrics";
export { getProviderRecommendation } from "@/lib/news/ai/editorial-image-provider";
export {
  fetchGenerationHistory,
  fetchRecentGenerationsForCompare,
} from "@/lib/news/ai/editorial-image-history";
