/**
 * AI editorial generation — original articles from clustered news_events
 * Stores only quality-passed rows in generated_articles
 */

import { createAdminServerClient } from "@/lib/supabase";
import { buildArticleSlug } from "@/lib/news/slug";
import { scoreSourceConfidence } from "@/lib/news/ai/event-clustering";
import {
  initialHeroPlaceholder,
  queueEditorialImageForArticle,
} from "@/lib/news/ai/generate-editorial-image";
import {
  runEditorialQualityChecks,
  type EditorialQualityReport,
  type SourceAttribution,
} from "@/lib/news/ai/editorial-guards";
import { logNewsroom } from "@/lib/newsroom/logger";
import type {
  GeneratedArticleInsert,
  GeneratedArticleRow,
  NewsEventRow,
  NewsSignalRow,
} from "@/lib/types/newsroom";

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const EDITORIAL_TIMEOUT_MS = 28_000;
const EXCERPT_MAX = 420;

export type SupportedEditorialLanguage = "hi" | "en";

export type EditorialDraft = {
  headline: string;
  summary: string;
  article_body: string;
  seo_title: string;
  seo_description: string;
  tags: string[];
  reading_time: string;
  language: SupportedEditorialLanguage;
};

export type EditorialGenerationResult = {
  ok: boolean;
  article: GeneratedArticleRow | null;
  draft: EditorialDraft | null;
  quality: EditorialQualityReport | null;
  skipped: boolean;
  reason?: string;
};

export type BatchEditorialResult = {
  generated: number;
  rejected: number;
  skipped: number;
  errors: string[];
  results: Array<{
    eventId: string;
    ok: boolean;
    reason?: string;
    confidence?: number;
  }>;
};

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

  if (!headline || !summary || !article_body) return null;

  const seo_title = (raw.seo_title?.trim() || headline).slice(0, 70);
  const seo_description = (raw.seo_description?.trim() || summary).slice(0, 160);
  const tags = (raw.tags ?? [])
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 8);

  return {
    headline,
    summary,
    article_body,
    seo_title,
    seo_description,
    tags,
    reading_time: computeReadingTime(article_body, language),
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
      ? "Write in clear, simple Hindi (Devanagari). Use short sentences. Regional Chhattisgarh context when relevant."
      : "Write in clear, simple English. Regional Chhattisgarh/India context when relevant.";

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

Rules (strict):
- Synthesize ONLY facts present in the user fact pack. Do NOT invent names, numbers, quotes, or outcomes.
- Do NOT copy phrasing from sources — write original editorial prose.
- Professional, concise, trustworthy tone. No sensationalism or clickbait.
- If a detail is missing, omit it rather than guessing.
- bilingual-ready: keep proper nouns accurate.

Return JSON only:
{
  "headline": "original headline, max 14 words",
  "summary": "2-3 sentence editorial summary",
  "sections": {
    "intro": "summary intro paragraph",
    "key_developments": "bullet-friendly facts as prose",
    "regional_implications": "why this matters locally",
    "background": "brief context",
    "conclusion": "measured closing"
  },
  "seo_title": "max 60 chars",
  "seo_description": "max 155 chars",
  "tags": ["tag1","tag2"]
}`,
      },
      {
        role: "user",
        content: factPackText,
      },
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

async function loadSignalsForEvent(
  event: NewsEventRow
): Promise<NewsSignalRow[]> {
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

function pickSourceHeroImage(signals: NewsSignalRow[]): string | null {
  const ranked = [...signals].sort(
    (a, b) => scoreSourceConfidence(b) - scoreSourceConfidence(a)
  );
  return ranked.find((s) => s.image_url)?.image_url ?? null;
}

/**
 * Generate one original editorial from a news_event + its signals.
 * Persists to generated_articles only when quality checks pass.
 */
export async function generateEditorialFromEvent(
  event: NewsEventRow
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

  const signals = await loadSignalsForEvent(event);
  if (!signals.length) {
    return {
      ok: false,
      article: null,
      draft: null,
      quality: null,
      skipped: true,
      reason: "no_signals_for_event",
    };
  }

  const language = resolveLanguage(event, signals);
  const { factPackText, sourceTexts, attributions } = buildFactPack(
    event,
    signals
  );

  logEditorial("generation_start", {
    eventId: event.id,
    signalCount: signals.length,
    language,
  });

  let llmRaw: LlmEditorialResponse | null;
  try {
    llmRaw = await callEditorialLlm(factPackText, language);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "LLM failed";
    logEditorial("llm_error", { eventId: event.id, message: msg });
    return {
      ok: false,
      article: null,
      draft: null,
      quality: null,
      skipped: false,
      reason: msg,
    };
  }

  const draft = llmRaw ? parseLlmDraft(llmRaw, language) : null;
  if (!draft) {
    return {
      ok: false,
      article: null,
      draft: null,
      quality: null,
      skipped: false,
      reason: "invalid_llm_response",
    };
  }

  const quality = runEditorialQualityChecks({
    headline: draft.headline,
    summary: draft.summary,
    articleBody: draft.article_body,
    seoTitle: draft.seo_title,
    seoDescription: draft.seo_description,
    sourceTexts,
    factPackText,
    sourceCount: signals.length,
  });

  logEditorial("quality_report", {
    eventId: event.id,
    passed: quality.passed,
    confidence: quality.ai_confidence,
    overlap: quality.source_overlap_score,
    duplicateCount: quality.duplicate_phrasing.length,
    flags: quality.hallucination_flags,
  });

  if (!quality.passed) {
    return {
      ok: false,
      article: null,
      draft,
      quality,
      skipped: false,
      reason: "quality_checks_failed",
    };
  }

  const supabase = createAdminServerClient();
  const slug = buildArticleSlug(draft.headline, event.id);
  const category =
    event.category ??
    signals.find((s) => s.category)?.category ??
    "world";
  const hero_image_url =
    pickSourceHeroImage(signals) ?? initialHeroPlaceholder(category);

  const row: GeneratedArticleInsert = {
    event_id: event.id,
    slug,
    headline: draft.headline,
    summary: draft.summary,
    article_body: draft.article_body,
    hero_image_url,
    seo_title: draft.seo_title,
    seo_description: draft.seo_description,
    reading_time: draft.reading_time,
    language: draft.language,
    tags: draft.tags.length ? draft.tags : event.category ? [event.category] : [],
    editorial_status: "pending",
    published_at: null,
    editorial_metadata: {
      ai_confidence: quality.ai_confidence,
      source_attribution: attributions,
      quality_report: quality,
      generated_at: new Date().toISOString(),
      model:
        process.env.NEWSROOM_EDITORIAL_MODEL?.trim() ||
        process.env.OPENAI_MODEL?.trim() ||
        "gpt-4o-mini",
      event_id: event.id,
      source_count: signals.length,
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
        source: pickSourceHeroImage(signals) ? "source_extracted" : "category_fallback",
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
        draft,
        quality,
        skipped: true,
        reason: "slug_already_exists",
      };
    }
    logEditorial("insert_failed", { message: error.message });
    return {
      ok: false,
      article: null,
      draft,
      quality,
      skipped: false,
      reason: error.message,
    };
  }

  logEditorial("generation_complete", {
    eventId: event.id,
    articleId: inserted.id,
    slug: inserted.slug,
    confidence: quality.ai_confidence,
  });

  await queueEditorialImageForArticle(inserted.id);

  return {
    ok: true,
    article: inserted,
    draft,
    quality,
    skipped: false,
  };
}

/**
 * Batch-generate editorials for events not yet in generated_articles.
 */
export async function generateEditorialsFromEvents(options?: {
  limit?: number;
}): Promise<BatchEditorialResult> {
  const limit = options?.limit ?? 8;

  if (!isEditorialEnabled()) {
    return {
      generated: 0,
      rejected: 0,
      skipped: 1,
      errors: ["OPENAI_API_KEY not set"],
      results: [],
    };
  }

  const supabase = createAdminServerClient();

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
      skipped: 1,
      errors: error ? [error.message] : [],
      results: [],
    };
  }

  const pending = events.filter((e) => !usedEventIds.has(e.id)).slice(0, limit);

  let generated = 0;
  let rejected = 0;
  let skipped = 0;
  const errors: string[] = [];
  const results: BatchEditorialResult["results"] = [];

  for (const event of pending) {
    const result = await generateEditorialFromEvent(event);
    results.push({
      eventId: event.id,
      ok: result.ok,
      reason: result.reason,
      confidence: result.quality?.ai_confidence,
    });

    if (result.ok) generated++;
    else if (result.skipped) skipped++;
    else {
      rejected++;
      if (result.reason) errors.push(`${event.id}: ${result.reason}`);
    }
  }

  logEditorial("batch_complete", { generated, rejected, skipped });

  return { generated, rejected, skipped, errors, results };
}
