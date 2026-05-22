/**
 * AI editorial generation — production-tolerant publishing from news_events
 */

import { createAdminServerClient } from "@/lib/supabase";
import { buildArticleSlug } from "@/lib/news/slug";
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

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
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

function isEditorialEnabled(): boolean {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
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
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return null;

  const langInstruction =
    language === "hi"
      ? "Write in clear, simple Hindi (Devanagari). Short sentences OK for breaking wire."
      : "Write in clear, simple English. Short wire-style OK for breaking news.";

  const body = {
    model:
      process.env.NEWSROOM_EDITORIAL_MODEL?.trim() ||
      process.env.OPENAI_MODEL?.trim() ||
      "gpt-4o-mini",
    temperature: 0.35,
    max_tokens: 2800,
    messages: [
      {
        role: "system",
        content: `You are a senior editor for a trustworthy regional digital newspaper (Chhattisgarh-first).
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
}`,
      },
      { role: "user", content: factPackText },
    ],
    response_format: { type: "json_object" as const },
  };

  const res = await fetch(OPENAI_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(EDITORIAL_TIMEOUT_MS),
  });

  if (!res.ok) {
    throw new Error(`OpenAI HTTP ${res.status}`);
  }

  const json = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = json.choices?.[0]?.message?.content;
  if (!content) return null;

  return JSON.parse(content) as LlmEditorialResponse;
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
  const slug = buildArticleSlug(input.draft.headline, input.event.id);
  const category =
    input.event.category ??
    input.signals.find((s) => s.category)?.category ??
    "world";
  const hero_image_url =
    pickSourceHeroImage(input.signals) ?? initialHeroPlaceholder(category);

  const row: GeneratedArticleInsert = {
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
    editorial_status: "pending",
    published_at: null,
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
    .insert(row)
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
    accepted: true,
    rejectionReasons: input.quality.rejectionReasons,
    storyId: inserted.id,
    title: input.draft.headline,
    eventId: input.event.id,
    repaired: input.repaired,
    batchRescue: input.batchRescue,
    quality_breakdown: input.quality.quality_breakdown,
  });

  await queueEditorialImageForArticle(inserted.id);

  return {
    ok: true,
    article: inserted,
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
      accepted: false,
      rejectionReasons: quality.rejectionReasons,
      storyId: null,
      title: candidate.draft.headline,
      eventId: event.id,
      repaired: candidate.repaired,
      quality_breakdown: quality.quality_breakdown,
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

  return persistGeneratedArticle({
    event: candidate.event,
    draft: candidate.draft,
    quality,
    signals: candidate.signals,
    attributions: candidate.attributions,
    repaired: candidate.repaired,
    usedFallback: candidate.usedFallback,
  });
}

/**
 * Batch-generate editorials; rescues top scorers if entire batch would fail.
 */
export async function generateEditorialsFromEvents(options?: {
  limit?: number;
}): Promise<BatchEditorialResult> {
  const limit = options?.limit ?? 8;

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

  for (const event of pending) {
    const prepared = await prepareCandidate(event, [
      ...existingHeadlines,
      ...failedCandidates.map((c) => c.draft.headline),
    ]);

    if (!prepared.candidate) {
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
        confidence: candidate.quality.ai_confidence,
        rejectionReasons: candidate.quality.rejectionReasons,
      });

      if (saved.ok && saved.article) {
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
        rejected++;
        if (saved.reason) errors.push(`${event.id}: ${saved.reason}`);
      }
    } else {
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
        confidence: candidate.quality.ai_confidence,
        rejectionReasons: candidate.quality.rejectionReasons,
      });

      logEditorialDecision({
        confidence: candidate.quality.ai_confidence,
        accepted: false,
        rejectionReasons: candidate.quality.rejectionReasons,
        storyId: null,
        title: candidate.draft.headline,
        eventId: event.id,
        repaired: candidate.repaired,
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
        published++;
        rejected = Math.max(0, rejected - 1);
        const idx = results.findIndex((r) => r.eventId === candidate.event.id);
        const entry = {
          eventId: candidate.event.id,
          ok: true,
          published: true,
          repaired: candidate.repaired,
          reason: "batch_rescue_top_scorer",
          confidence: quality.ai_confidence,
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
