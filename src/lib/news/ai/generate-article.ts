/**
 * AI editorial generation — production-tolerant publishing from news_events
 */

import { requestChatCompletion } from "@/lib/ai/providers";
import { createAdminServerClient } from "@/lib/supabase";
import { INFRA_CONFIG } from "@/lib/infrastructure/config";
import { runWithConcurrency } from "@/lib/infrastructure/concurrency/pool";
import { buildNewsShortForArticle } from "@/lib/news/shorts/build-short";
import { translateGeneratedArticle } from "@/lib/i18n/multilingual/translate";
import { geoFromRecord, mergeGeoMetadata, tagGeoFromContent } from "@/lib/regional/geo-tagging";
import { scoreRegionalTopic } from "@/lib/regional/topic-scoring";
import { optimizeSeoSlug } from "@/lib/seo/slug-optimize";
import { getPipelineTenantId } from "@/lib/tenant/pipeline";
import { scoreSourceConfidence } from "@/lib/news/ai/event-clustering";
import {
  initialHeroPlaceholder,
  queueEditorialImageForArticle,
} from "@/lib/news/ai/generate-editorial-image";
import {
  logEditorialDecision,
  runEditorialQualityChecks,
  type EditorialQualityReport,
  type SourceAttribution,
} from "@/lib/news/ai/editorial-guards";
import {
  applyEditorialEnhancements,
  buildFallbackDraftFromFactPack,
  repairBorderlineDraft,
} from "@/lib/news/ai/editorial-repair";
import type {
  BatchEditorialResult,
  EditorialDraft,
  EditorialGenerationResult,
  SupportedEditorialLanguage,
} from "@/lib/news/ai/editorial-types";
import { logNewsroom } from "@/lib/newsroom/logger";
import { asJson } from "@/types/json";
import type {
  GeneratedArticleInsert,
  GeneratedArticleRow,
  NewsEventRow,
  NewsSignalRow,
} from "@/lib/types/newsroom";

export type {
  BatchEditorialResult,
  EditorialDraft,
  EditorialGenerationResult,
  SupportedEditorialLanguage,
} from "@/lib/news/ai/editorial-types";

const EDITORIAL_TIMEOUT_MS = 28_000;
const EXCERPT_MAX = 420;
const BATCH_RESCUE_COUNT = 2;

type LlmEditorialResponse = {
  headline?: string;
  summary?: string;
  sections?: {
    intro?: string;
    key_developments?: string;
    regional_implications?: string;
    background?: string;
    conclusion?: string;
  };
  seo_title?: string;
  seo_description?: string;
  tags?: string[];
};

const SECTION_LABELS: Record<
  SupportedEditorialLanguage,
  Record<keyof NonNullable<LlmEditorialResponse["sections"]>, string>
> = {
  hi: {
    intro: "सारांश",
    key_developments: "मुख्य घटनाक्रम",
    regional_implications: "क्षेत्रीय प्रभाव",
    background: "पृष्ठभूमि",
    conclusion: "निष्कर्ष",
  },
  en: {
    intro: "Summary",
    key_developments: "Key developments",
    regional_implications: "Regional implications",
    background: "Background",
    conclusion: "Conclusion",
  },
};

type PendingCandidate = {
  event: NewsEventRow;
  draft: EditorialDraft;
  quality: EditorialQualityReport;
  signals: NewsSignalRow[];
  attributions: SourceAttribution[];
  repaired: boolean;
  usedFallback: boolean;
};

function logEditorial(message: string, context?: Record<string, unknown>): void {
  console.log(`[generate-article] ${message}`, context ? JSON.stringify(context) : "");
  logNewsroom("generated", message, context);
}

function logArticleGenerationPhase(
  phase:
    | "article_generation_started"
    | "article_generation_completed"
    | "article_generation_failed",
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

function qualityResultFields(quality: EditorialQualityReport) {
  return {
    confidence: quality.ai_confidence,
    readability: quality.quality_breakdown.readability,
    seoQuality: quality.quality_breakdown.seo_quality,
    localRelevance: quality.quality_breakdown.local_relevance,
    originality: quality.quality_breakdown.originality,
    publishDecision: quality.publishDecision,
    rejectionReasons: quality.rejectionReasons,
  };
}

function isEditorialEnabled(): boolean {
  return (
    process.env.NEWSROOM_GENERATE_ARTICLES === "true" &&
    Boolean(process.env.OPENAI_API_KEY?.trim())
  );
}

function resolveLanguage(
  event: NewsEventRow,
  signals: NewsSignalRow[]
): SupportedEditorialLanguage {
  const env = process.env.NEWSROOM_EDITORIAL_LANGUAGE?.trim() as
    | SupportedEditorialLanguage
    | undefined;
  if (env === "hi" || env === "en") return env;

  const langs = signals.map((s) => s.language?.toLowerCase()).filter(Boolean);
  const hiCount = langs.filter((l) => l?.startsWith("hi")).length;
  if (hiCount >= langs.length / 2) return "hi";
  if (event.region === "chhattisgarh") return "hi";
  return "en";
}

function buildFactPack(event: NewsEventRow, signals: NewsSignalRow[]): {
  factPackText: string;
  sourceTexts: string[];
  attributions: SourceAttribution[];
} {
  const attributions: SourceAttribution[] = signals.map((s) => ({
    signal_id: s.id,
    source: s.source,
    provider: s.provider,
    article_url: s.article_url,
    published_at: s.published_at,
    confidence: scoreSourceConfidence(s),
  }));

  const facts = signals.map((s, i) => {
    const excerpt = (s.raw_content ?? s.title).trim().slice(0, EXCERPT_MAX);
    return `[${i + 1}] source=${s.source ?? s.provider} | url=${s.article_url} | published=${s.published_at ?? "unknown"}\nTitle: ${s.title}\nExcerpt: ${excerpt}`;
  });

  const factPackText = [
    `Event: ${event.canonical_title}`,
    `Category: ${event.category ?? "general"}`,
    `Region: ${event.region ?? "india"}`,
    `Editorial summary (cluster): ${event.event_summary ?? ""}`,
    `Source count: ${signals.length}`,
    "--- Facts from sources (synthesize only from these) ---",
    ...facts,
  ].join("\n\n");

  const sourceTexts = signals.map(
    (s) => `${s.title} ${s.raw_content ?? ""}`.trim()
  );

  return { factPackText, sourceTexts, attributions };
}

function computeReadingTime(body: string, language: SupportedEditorialLanguage): string {
  const words = body.split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.round(words / 200));
  return language === "hi" ? `${minutes} मिनट` : `${minutes} min read`;
}

function assembleArticleBody(
  sections: NonNullable<LlmEditorialResponse["sections"]>,
  language: SupportedEditorialLanguage
): string {
  const labels = SECTION_LABELS[language];
  const order: (keyof typeof labels)[] = [
    "intro",
    "key_developments",
    "regional_implications",
    "background",
    "conclusion",
  ];

  return order
    .map((key) => {
      const text = sections[key]?.trim();
      if (!text) return "";
      return `## ${labels[key]}\n\n${text}`;
    })
    .filter(Boolean)
    .join("\n\n");
}

function parseLlmDraft(
  raw: LlmEditorialResponse,
  language: SupportedEditorialLanguage
): EditorialDraft | null {
  const sections = raw.sections ?? {};
  const article_body = assembleArticleBody(sections, language);
  const headline = raw.headline?.trim();
  const summary = raw.summary?.trim();

  if (!headline || !summary) return null;
  if (!article_body && summary.length < 20) return null;

  const body =
    article_body ||
    `## ${SECTION_LABELS[language].intro}\n\n${summary}`;

  const seo_title = (raw.seo_title?.trim() || headline).slice(0, 70);
  const seo_description = (raw.seo_description?.trim() || summary).slice(0, 160);
  const tags = (raw.tags ?? [])
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 8);

  return {
    headline,
    summary,
    article_body: body,
    seo_title,
    seo_description,
    tags,
    reading_time: computeReadingTime(body, language),
    language,
  };
}

async function callEditorialLlm(
  factPackText: string,
  language: SupportedEditorialLanguage
): Promise<LlmEditorialResponse | null> {
  const langInstruction =
    language === "hi"
      ? "Write in clear, simple Hindi (Devanagari). Short sentences OK for breaking wire."
      : "Write in clear, simple English. Short wire-style OK for breaking news.";

  const system = `You are a senior editor for a trustworthy regional digital newspaper (Chhattisgarh-first).
${langInstruction}

Rules:
- Synthesize ONLY facts present in the user fact pack. Do NOT invent names, numbers, quotes, or outcomes.
- Prefer original phrasing; light paraphrase of wire copy is acceptable for regional/breaking items.
- Professional, concise tone. Avoid sensationalism.
- Short regional or breaking stories are valid — partial sections are OK if facts are thin.

Return JSON only:
{
  "headline": "original headline",
  "summary": "1-3 sentence summary",
  "sections": {
    "intro": "paragraph",
    "key_developments": "prose or bullets as prose",
    "regional_implications": "local angle (optional if thin)",
    "background": "brief context (optional)",
    "conclusion": "closing (optional)"
  },
  "seo_title": "max 60 chars",
  "seo_description": "max 155 chars",
  "tags": ["tag1","tag2"]
}`;

  const model =
    process.env.NEWSROOM_EDITORIAL_MODEL?.trim() ||
    process.env.OPENAI_MODEL?.trim() ||
    "gpt-4o-mini";

  const result = await requestChatCompletion({
    operation: "editorial_generate",
    system,
    user: factPackText,
    model,
    temperature: 0.35,
    maxTokens: 2800,
    jsonMode: true,
    timeoutMs: EDITORIAL_TIMEOUT_MS,
  });

  if (!result.ok) return null;

  try {
    return JSON.parse(result.content) as LlmEditorialResponse;
  } catch {
    return null;
  }
}

async function loadSignalsForEvent(event: NewsEventRow): Promise<NewsSignalRow[]> {
  if (!event.signal_ids?.length) return [];

  const supabase = createAdminServerClient();
  const { data, error } = await supabase
    .from("news_signals")
    .select("*")
    .in("id", event.signal_ids);

  if (error) {
    logEditorial("load_signals_error", { message: error.message });
    return [];
  }

  return data ?? [];
}

async function loadExistingHeadlines(): Promise<string[]> {
  const supabase = createAdminServerClient();
  const { data } = await supabase
    .from("generated_articles")
    .select("headline")
    .order("created_at", { ascending: false })
    .limit(200);
  return (data ?? []).map((r) => r.headline);
}

function pickSourceHeroImage(signals: NewsSignalRow[]): string | null {
  const ranked = [...signals].sort(
    (a, b) => scoreSourceConfidence(b) - scoreSourceConfidence(a)
  );
  return ranked.find((s) => s.image_url)?.image_url ?? null;
}

function evaluateDraft(input: {
  draft: EditorialDraft;
  event: NewsEventRow;
  signals: NewsSignalRow[];
  factPackText: string;
  sourceTexts: string[];
  existingHeadlines: string[];
  forcePublish?: boolean;
}): EditorialQualityReport {
  return runEditorialQualityChecks({
    headline: input.draft.headline,
    summary: input.draft.summary,
    articleBody: input.draft.article_body,
    seoTitle: input.draft.seo_title,
    seoDescription: input.draft.seo_description,
    sourceTexts: input.sourceTexts,
    factPackText: input.factPackText,
    sourceCount: input.signals.length,
    region: input.event.region,
    category: input.event.category,
    language: input.draft.language,
    existingHeadlines: input.existingHeadlines,
    forcePublish: input.forcePublish,
    event: input.event,
  });
}

async function persistGeneratedArticle(input: {
  event: NewsEventRow;
  draft: EditorialDraft;
  quality: EditorialQualityReport;
  signals: NewsSignalRow[];
  attributions: SourceAttribution[];
  repaired: boolean;
  usedFallback: boolean;
  batchRescue?: boolean;
}): Promise<EditorialGenerationResult> {
  const supabase = createAdminServerClient();
  const slug = optimizeSeoSlug(input.draft.headline, input.event.id);
  const category =
    input.event.category ??
    input.signals.find((s) => s.category)?.category ??
    "world";
  const hero_image_url =
    pickSourceHeroImage(input.signals) ?? initialHeroPlaceholder(category);

  const signalGeos = input.signals.map((s) =>
    tagGeoFromContent({
      title: s.title,
      body: s.raw_content,
      region: s.region,
      category: s.category,
    })
  );
  const draftGeo = tagGeoFromContent({
    title: input.draft.headline,
    body: [input.draft.summary, input.draft.article_body].join("\n"),
    region: input.event.region,
    category,
  });
  const geo = mergeGeoMetadata(
    geoFromRecord(input.event),
    ...signalGeos,
    draftGeo
  );
  const regionalTopic = scoreRegionalTopic({
    headline: input.draft.headline,
    summary: input.draft.summary,
    articleBody: input.draft.article_body,
    region: input.event.region,
    category,
    geo,
  });

  // Auto-publish gate: when NEWSROOM_AUTO_PUBLISH=true, articles that pass the
  // editorial quality checks go straight to the public homepage instead of
  // waiting in the human-approval workflow. Reaching persist already means
  // quality.publish_allowed === true, so these are quality-passed stories.
  const autoPublish = process.env.NEWSROOM_AUTO_PUBLISH === "true";
  const publishNow = autoPublish ? new Date().toISOString() : null;

  const row: GeneratedArticleInsert = {
    tenant_id: getPipelineTenantId(),
    event_id: input.event.id,
    slug,
    headline: input.draft.headline,
    summary: input.draft.summary,
    article_body: input.draft.article_body,
    hero_image_url,
    seo_title: input.draft.seo_title,
    seo_description: input.draft.seo_description,
    reading_time: input.draft.reading_time,
    language: input.draft.language,
    tags: input.draft.tags.length
      ? input.draft.tags
      : input.event.category
        ? [input.event.category]
        : [],
    editorial_status: autoPublish ? "approved" : "pending",
    published_at: publishNow,
    workflow_status: autoPublish ? "published" : "draft",
    reviewed_at: publishNow,
    geo_metadata: geo,
    editorial_metadata: {
      ai_confidence: input.quality.ai_confidence,
      source_attribution: input.attributions,
      quality_report: input.quality,
      quality_breakdown: input.quality.quality_breakdown,
      rejection_reasons: input.quality.rejectionReasons,
      repaired: input.repaired,
      used_fallback: input.usedFallback,
      batch_rescue: input.batchRescue ?? false,
      generated_at: new Date().toISOString(),
      model:
        process.env.NEWSROOM_EDITORIAL_MODEL?.trim() ||
        process.env.OPENAI_MODEL?.trim() ||
        "gpt-4o-mini",
      event_id: input.event.id,
      source_count: input.signals.length,
      duplicate_cluster_id: input.quality.duplicate_cluster_id,
      breaking_score: input.quality.quality_breakdown.breaking_score,
      trend_score: input.quality.quality_breakdown.trend_score,
      headline_quality: input.quality.quality_breakdown.headline_quality,
      spam_score: input.quality.quality_breakdown.spam_score,
      publish_decision: input.quality.publishDecision,
      regional: geo,
      regional_topic_score: regionalTopic.score,
      structure: [
        "intro",
        "key_developments",
        "regional_implications",
        "background",
        "conclusion",
      ],
      image: {
        status: "queued",
        hero_url: hero_image_url,
        source: pickSourceHeroImage(input.signals)
          ? "source_extracted"
          : "category_fallback",
      },
    },
  };

  const { data: inserted, error } = await supabase
    .from("generated_articles")
    .insert({
      ...row,
      geo_metadata: asJson(row.geo_metadata),
      editorial_metadata: asJson(row.editorial_metadata),
    })
    .select("*")
    .single();

  if (error) {
    if (error.code === "23505") {
      return {
        ok: false,
        article: null,
        draft: input.draft,
        quality: input.quality,
        skipped: true,
        reason: "slug_already_exists",
      };
    }
    return {
      ok: false,
      article: null,
      draft: input.draft,
      quality: input.quality,
      skipped: false,
      reason: error.message,
    };
  }

  logEditorialDecision({
    confidence: input.quality.ai_confidence,
    readability: input.quality.quality_breakdown.readability,
    seoQuality: input.quality.quality_breakdown.seo_quality,
    localRelevance: input.quality.quality_breakdown.local_relevance,
    originality: input.quality.quality_breakdown.originality,
    publishDecision: input.quality.publishDecision,
    accepted: true,
    rejectionReasons: input.quality.rejectionReasons,
    storyId: inserted.id,
    title: input.draft.headline,
    eventId: input.event.id,
    repaired: input.repaired,
    batchRescue: input.batchRescue,
    breakingScore: input.quality.quality_breakdown.breaking_score,
    trendScore: input.quality.quality_breakdown.trend_score,
    duplicateClusterId: input.quality.duplicate_cluster_id,
    quality_breakdown: input.quality.quality_breakdown,
  });

  await queueEditorialImageForArticle(inserted.id);

  if (
    process.env.NEWSROOM_AUTO_TRANSLATE === "true" &&
    process.env.OPENAI_API_KEY?.trim()
  ) {
    void translateGeneratedArticle(inserted as unknown as GeneratedArticleRow).catch(
      () => undefined
    );
  }

  if (
    process.env.NEWSROOM_AUTO_SHORTS === "true" &&
    process.env.OPENAI_API_KEY?.trim()
  ) {
    void buildNewsShortForArticle(inserted as unknown as GeneratedArticleRow).catch(
      () => undefined
    );
  }

  return {
    ok: true,
    article: inserted as unknown as GeneratedArticleRow,
    draft: input.draft,
    quality: input.quality,
    skipped: false,
    repaired: input.repaired,
    usedFallback: input.usedFallback,
  };
}

async function prepareCandidate(
  event: NewsEventRow,
  existingHeadlines: string[]
): Promise<{
  candidate: PendingCandidate | null;
  skipped: boolean;
  reason?: string;
}> {
  const signals = await loadSignalsForEvent(event);
  if (!signals.length) {
    return { candidate: null, skipped: true, reason: "no_signals_for_event" };
  }

  const language = resolveLanguage(event, signals);
  const { factPackText, sourceTexts, attributions } = buildFactPack(
    event,
    signals
  );

  let draft: EditorialDraft | null = null;
  let usedFallback = false;

  try {
    const llmRaw = await callEditorialLlm(factPackText, language);
    draft = llmRaw ? parseLlmDraft(llmRaw, language) : null;
  } catch (err) {
    logEditorial("llm_error", {
      eventId: event.id,
      message: err instanceof Error ? err.message : "LLM failed",
    });
  }

  if (!draft) {
    draft = buildFallbackDraftFromFactPack({ event, signals, language });
    usedFallback = true;
    logEditorial("fallback_draft_used", { eventId: event.id });
  } else {
    draft = applyEditorialEnhancements(draft, event);
  }

  let repaired = false;
  let quality = evaluateDraft({
    draft,
    event,
    signals,
    factPackText,
    sourceTexts,
    existingHeadlines,
  });

  if (quality.should_repair && !quality.hard_reject) {
    draft = await repairBorderlineDraft({
      draft,
      event,
      factPackText,
      language,
    });
    repaired = true;
    quality = evaluateDraft({
      draft,
      event,
      signals,
      factPackText,
      sourceTexts,
      existingHeadlines,
    });
    logEditorial("borderline_repaired", {
      eventId: event.id,
      confidence: quality.ai_confidence,
      passed: quality.publish_allowed,
    });
  }

  return {
    candidate: {
      event,
      draft,
      quality,
      signals,
      attributions,
      repaired,
      usedFallback,
    },
    skipped: false,
  };
}

/**
 * Generate one original editorial from a news_event + its signals.
 */
export async function generateEditorialFromEvent(
  event: NewsEventRow,
  options?: { existingHeadlines?: string[]; forcePublish?: boolean }
): Promise<EditorialGenerationResult> {
  logArticleGenerationPhase("article_generation_started", {
    eventId: event.id,
    region: event.region,
    category: event.category,
    sourceCount: event.source_count,
  });
  if (!isEditorialEnabled()) {
    return {
      ok: false,
      article: null,
      draft: null,
      quality: null,
      skipped: true,
      reason: "OPENAI_API_KEY not set",
    };
  }

  const existingHeadlines =
    options?.existingHeadlines ?? (await loadExistingHeadlines());

  const prepared = await prepareCandidate(event, existingHeadlines);
  if (!prepared.candidate) {
    logArticleGenerationPhase("article_generation_failed", {
      eventId: event.id,
      reason: prepared.reason ?? "prepare_candidate_failed",
      skipped: prepared.skipped,
    });
    return {
      ok: false,
      article: null,
      draft: null,
      quality: null,
      skipped: prepared.skipped,
      reason: prepared.reason,
    };
  }

  const { candidate } = prepared;
  let quality = candidate.quality;

  if (options?.forcePublish && !quality.hard_reject) {
    quality = evaluateDraft({
      draft: candidate.draft,
      event: candidate.event,
      signals: candidate.signals,
      factPackText: buildFactPack(candidate.event, candidate.signals).factPackText,
      sourceTexts: buildFactPack(candidate.event, candidate.signals).sourceTexts,
      existingHeadlines,
      forcePublish: true,
    });
  }

  logEditorial("quality_report", {
    eventId: event.id,
    passed: quality.publish_allowed,
    confidence: quality.ai_confidence,
    overlap: quality.source_overlap_score,
    hardReject: quality.hard_reject,
    rejectionReasons: quality.rejectionReasons,
    breakdown: quality.quality_breakdown,
    minConfidence: quality.min_confidence_used,
    strictMode: quality.strict_mode,
  });

  if (!quality.publish_allowed) {
    logEditorialDecision({
      confidence: quality.ai_confidence,
      readability: quality.quality_breakdown.readability,
      seoQuality: quality.quality_breakdown.seo_quality,
      localRelevance: quality.quality_breakdown.local_relevance,
      originality: quality.quality_breakdown.originality,
      publishDecision: quality.publishDecision,
      accepted: false,
      rejectionReasons: quality.rejectionReasons,
      storyId: null,
      title: candidate.draft.headline,
      eventId: event.id,
      repaired: candidate.repaired,
      breakingScore: quality.quality_breakdown.breaking_score,
      trendScore: quality.quality_breakdown.trend_score,
      duplicateClusterId: quality.duplicate_cluster_id,
      quality_breakdown: quality.quality_breakdown,
    });

    logArticleGenerationPhase("article_generation_failed", {
      eventId: event.id,
      reason: quality.hard_reject
        ? quality.hard_reject_reasons.join(",")
        : "quality_checks_failed",
      hardReject: quality.hard_reject,
      confidence: quality.ai_confidence,
    });
    return {
      ok: false,
      article: null,
      draft: candidate.draft,
      quality,
      skipped: false,
      repaired: candidate.repaired,
      usedFallback: candidate.usedFallback,
      reason: quality.hard_reject
        ? quality.hard_reject_reasons.join(",")
        : "quality_checks_failed",
    };
  }

  const persisted = await persistGeneratedArticle({
    event: candidate.event,
    draft: candidate.draft,
    quality,
    signals: candidate.signals,
    attributions: candidate.attributions,
    repaired: candidate.repaired,
    usedFallback: candidate.usedFallback,
  });
  if (persisted.ok && persisted.article) {
    logArticleGenerationPhase("article_generation_completed", {
      eventId: event.id,
      articleId: persisted.article.id,
      headline: persisted.article.headline,
      confidence: quality.ai_confidence,
    });
  } else {
    logArticleGenerationPhase("article_generation_failed", {
      eventId: event.id,
      reason: persisted.reason ?? "persist_failed",
      skipped: persisted.skipped,
    });
  }
  return persisted;
}

/**
 * Batch-generate editorials; rescues top scorers if entire batch would fail.
 */
export async function generateEditorialsFromEvents(options?: {
  limit?: number;
}): Promise<BatchEditorialResult> {
  const limit = options?.limit ?? INFRA_CONFIG.editorialBatchLimit;

  if (!isEditorialEnabled()) {
    return {
      generated: 0,
      rejected: 0,
      published: 0,
      repaired: 0,
      skipped: 1,
      avgConfidence: 0,
      topStory: null,
      errors: ["OPENAI_API_KEY not set"],
      results: [],
    };
  }

  const supabase = createAdminServerClient();
  const existingHeadlines = await loadExistingHeadlines();

  const { data: existing } = await supabase
    .from("generated_articles")
    .select("event_id");

  const usedEventIds = new Set(
    (existing ?? []).map((r) => r.event_id).filter(Boolean)
  );

  const { data: events, error } = await supabase
    .from("news_events")
    .select("*")
    .order("urgency_score", { ascending: false })
    .limit(limit * 3);

  if (error || !events?.length) {
    return {
      generated: 0,
      rejected: 0,
      published: 0,
      repaired: 0,
      skipped: 1,
      avgConfidence: 0,
      topStory: null,
      errors: error ? [error.message] : [],
      results: [],
    };
  }

  const pending = events.filter((e) => !usedEventIds.has(e.id)).slice(0, limit);

  let published = 0;
  let rejected = 0;
  let repaired = 0;
  let skipped = 0;
  const errors: string[] = [];
  const results: BatchEditorialResult["results"] = [];
  const failedCandidates: PendingCandidate[] = [];
  const confidenceScores: number[] = [];
  let lastPublishedStory: { id: string; title: string; confidence: number } | null =
    null;

  const preparedList = await runWithConcurrency(
    pending,
    INFRA_CONFIG.editorialConcurrency,
    (event) =>
      prepareCandidate(event, [
        ...existingHeadlines,
        ...failedCandidates.map((c) => c.draft.headline),
      ])
  );

  for (let i = 0; i < pending.length; i++) {
    const event = pending[i];
    const prepared = preparedList[i];
    logArticleGenerationPhase("article_generation_started", {
      eventId: event.id,
      region: event.region,
      category: event.category,
      sourceCount: event.source_count,
      mode: "batch",
    });

    if (!prepared.candidate) {
      logArticleGenerationPhase("article_generation_failed", {
        eventId: event.id,
        reason: prepared.reason ?? "prepare_candidate_failed",
        skipped: true,
        mode: "batch",
      });
      skipped++;
      results.push({
        eventId: event.id,
        ok: false,
        reason: prepared.reason,
      });
      continue;
    }

    const { candidate } = prepared;
    confidenceScores.push(candidate.quality.ai_confidence);

    if (candidate.repaired) repaired++;

    if (candidate.quality.publish_allowed) {
      const saved = await persistGeneratedArticle({
        event: candidate.event,
        draft: candidate.draft,
        quality: candidate.quality,
        signals: candidate.signals,
        attributions: candidate.attributions,
        repaired: candidate.repaired,
        usedFallback: candidate.usedFallback,
      });

      results.push({
        eventId: event.id,
        ok: saved.ok,
        published: saved.ok,
        repaired: candidate.repaired,
        reason: saved.reason,
        ...qualityResultFields(candidate.quality),
      });

      if (saved.ok && saved.article) {
        logArticleGenerationPhase("article_generation_completed", {
          eventId: event.id,
          articleId: saved.article.id,
          headline: saved.article.headline,
          confidence: candidate.quality.ai_confidence,
          mode: "batch",
        });
        published++;
        existingHeadlines.push(candidate.draft.headline);
        if (
          !lastPublishedStory ||
          candidate.quality.ai_confidence > lastPublishedStory.confidence
        ) {
          lastPublishedStory = {
            id: saved.article.id,
            title: saved.article.headline,
            confidence: candidate.quality.ai_confidence,
          };
        }
      } else if (saved.skipped) skipped++;
      else {
        logArticleGenerationPhase("article_generation_failed", {
          eventId: event.id,
          reason: saved.reason ?? "persist_failed",
          skipped: false,
          mode: "batch",
        });
        rejected++;
        if (saved.reason) errors.push(`${event.id}: ${saved.reason}`);
      }
    } else {
      logArticleGenerationPhase("article_generation_failed", {
        eventId: event.id,
        reason: candidate.quality.hard_reject
          ? candidate.quality.hard_reject_reasons.join(",")
          : "quality_checks_failed",
        hardReject: candidate.quality.hard_reject,
        confidence: candidate.quality.ai_confidence,
        mode: "batch",
      });
      failedCandidates.push(candidate);
      rejected++;
      results.push({
        eventId: event.id,
        ok: false,
        published: false,
        repaired: candidate.repaired,
        reason: candidate.quality.hard_reject
          ? candidate.quality.hard_reject_reasons.join(",")
          : "quality_checks_failed",
        ...qualityResultFields(candidate.quality),
      });

      logEditorialDecision({
        ...qualityResultFields(candidate.quality),
        accepted: false,
        storyId: null,
        title: candidate.draft.headline,
        eventId: event.id,
        repaired: candidate.repaired,
        breakingScore: candidate.quality.quality_breakdown.breaking_score,
        trendScore: candidate.quality.quality_breakdown.trend_score,
        duplicateClusterId: candidate.quality.duplicate_cluster_id,
        quality_breakdown: candidate.quality.quality_breakdown,
      });
    }
  }

  if (published === 0 && failedCandidates.length > 0) {
    const rescuable = failedCandidates
      .filter((c) => !c.quality.hard_reject)
      .sort((a, b) => b.quality.ai_confidence - a.quality.ai_confidence)
      .slice(0, BATCH_RESCUE_COUNT);

    for (const candidate of rescuable) {
      const { factPackText, sourceTexts } = buildFactPack(
        candidate.event,
        candidate.signals
      );
      const quality = evaluateDraft({
        draft: candidate.draft,
        event: candidate.event,
        signals: candidate.signals,
        factPackText,
        sourceTexts,
        existingHeadlines,
        forcePublish: true,
      });

      const saved = await persistGeneratedArticle({
        event: candidate.event,
        draft: candidate.draft,
        quality,
        signals: candidate.signals,
        attributions: candidate.attributions,
        repaired: candidate.repaired,
        usedFallback: candidate.usedFallback,
        batchRescue: true,
      });

      if (saved.ok && saved.article) {
        logArticleGenerationPhase("article_generation_completed", {
          eventId: candidate.event.id,
          articleId: saved.article.id,
          headline: saved.article.headline,
          confidence: quality.ai_confidence,
          mode: "batch_rescue",
        });
        published++;
        rejected = Math.max(0, rejected - 1);
        const idx = results.findIndex((r) => r.eventId === candidate.event.id);
        const entry = {
          eventId: candidate.event.id,
          ok: true,
          published: true,
          repaired: candidate.repaired,
          reason: "batch_rescue_top_scorer",
          ...qualityResultFields(quality),
          rejectionReasons: [] as string[],
        };
        if (idx >= 0) results[idx] = entry;
        else results.push(entry);
        existingHeadlines.push(candidate.draft.headline);
        if (
          !lastPublishedStory ||
          quality.ai_confidence > lastPublishedStory.confidence
        ) {
          lastPublishedStory = {
            id: saved.article.id,
            title: saved.article.headline,
            confidence: quality.ai_confidence,
          };
        }
      }
      if (!saved.ok) {
        logArticleGenerationPhase("article_generation_failed", {
          eventId: candidate.event.id,
          reason: saved.reason ?? "batch_rescue_persist_failed",
          skipped: saved.skipped,
          mode: "batch_rescue",
        });
      }
    }

    logEditorial("batch_rescue", {
      rescued: published,
      candidates: rescuable.length,
    });
  }

  const avgConfidence =
    confidenceScores.length > 0
      ? Math.round(
          (confidenceScores.reduce((a, b) => a + b, 0) / confidenceScores.length) *
            1000
        ) / 1000
      : 0;

  let topStory: BatchEditorialResult["topStory"] = null;
  const bestFailed = [...failedCandidates].sort(
    (a, b) => b.quality.ai_confidence - a.quality.ai_confidence
  )[0];

  if (lastPublishedStory) {
    topStory = {
      storyId: lastPublishedStory.id,
      title: lastPublishedStory.title,
      confidence: lastPublishedStory.confidence,
    };
  } else if (bestFailed) {
    topStory = {
      storyId: null,
      title: bestFailed.draft.headline,
      confidence: bestFailed.quality.ai_confidence,
    };
  }

  logEditorial("batch_complete", {
    published,
    rejected,
    repaired,
    skipped,
    avgConfidence,
    topStory,
  });

  return {
    generated: published,
    rejected,
    published,
    repaired,
    skipped,
    avgConfidence,
    topStory,
    errors,
    results,
  };
}
