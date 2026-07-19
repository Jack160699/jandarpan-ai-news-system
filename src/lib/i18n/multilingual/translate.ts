/**
 * AI translation — headlines, body, and SEO metadata
 */

import { createAdminServerClient } from "@/lib/supabase";
import { asJson } from "@/types/json";
import {
  normalizeArticleLanguage,
  readingTimeLabel,
  type NewsroomLanguage,
} from "@/lib/i18n/languages";
import {
  buildToneSystemPrompt,
  getRegionalToneProfile,
} from "@/lib/i18n/multilingual/tone";
import { getArticleTranslations } from "@/lib/i18n/resolve-article";
import type {
  ArticleLocaleBundle,
  ArticleTranslations,
  TranslationJobResult,
} from "@/lib/i18n/multilingual/types";
import type { GeneratedArticleRow } from "@/lib/types/newsroom";
import { recordDirectChatCompletion } from "@/lib/observability/openai-cost";
import {
  computeSourceContentVersion,
  resolveTranslationUrgencyScore,
  withSourceContentVersion,
} from "@/lib/i18n/multilingual/translation-contract";
import {
  adaptiveTranslationBodySlice,
  classifyTranslationBodyTierFromText,
  translationMaxTokens,
} from "@/lib/observability/openai-cost/adaptive-tokens";
import {
  lookupPromptCache,
  storePromptCache,
} from "@/lib/observability/openai-cost/prompt-cache";
import { buildUsageRecord } from "@/lib/observability/openai-cost/record";

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

export const DEFAULT_TRANSLATION_TARGETS: NewsroomLanguage[] = [
  "en",
  "cg",
  "mr",
  "bn",
  "ta",
];

function parseTranslationTargets(): NewsroomLanguage[] {
  const raw = process.env.NEWSROOM_TRANSLATE_LANGS?.trim();
  if (!raw) return DEFAULT_TRANSLATION_TARGETS;
  return raw
    .split(",")
    .map((s) => normalizeArticleLanguage(s))
    .filter((l, i, arr) => arr.indexOf(l) === i);
}

function estimateMinutes(body: string): number {
  const words = body.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

type LlmTranslationResponse = {
  headline?: string;
  summary?: string;
  article_body?: string;
  seo_title?: string;
  seo_description?: string;
  tags?: string[];
};

export async function translateArticleBundle(input: {
  headline: string;
  summary: string;
  article_body: string;
  seo_title: string;
  seo_description: string;
  tags?: string[];
  sourceLanguage: NewsroomLanguage;
  targetLanguage: NewsroomLanguage;
  articleId?: string;
  /** Intended: news_events.urgency_score; resolved via resolveTranslationUrgencyScore */
  urgencyScore?: number | null;
  sourceContentVersion?: string;
}): Promise<ArticleLocaleBundle | null> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return null;
  if (input.sourceLanguage === input.targetLanguage) {
    const mins = estimateMinutes(input.article_body);
    const sameLang: ArticleLocaleBundle = {
      headline: input.headline,
      summary: input.summary,
      article_body: input.article_body,
      seo_title: input.seo_title,
      seo_description: input.seo_description,
      tags: input.tags,
      reading_time: readingTimeLabel(mins, input.targetLanguage),
      translated_at: new Date().toISOString(),
      tone_profile: getRegionalToneProfile(input.targetLanguage).id,
    };
    return input.sourceContentVersion
      ? withSourceContentVersion(sameLang, input.sourceContentVersion)
      : sameLang;
  }

  const system = buildToneSystemPrompt(
    input.targetLanguage,
    input.sourceLanguage
  );

  // Always bind urgencyScore before adaptive helpers — production previously
  // failed with ReferenceError when a bare identifier was passed undeclared.
  const urgencyScore = resolveTranslationUrgencyScore({
    payloadUrgency: input.urgencyScore,
  });
  const bodySlice = adaptiveTranslationBodySlice(
    input.article_body,
    urgencyScore
  );
  const bodyTier = classifyTranslationBodyTierFromText(
    input.article_body,
    urgencyScore
  );
  const maxTokens = translationMaxTokens({
    bodyChars: bodySlice.length,
    targetLanguage: input.targetLanguage,
    tier: bodyTier,
  });

  const userContent = `Translate this news article JSON fields into the target language.

Source JSON:
${JSON.stringify({
  headline: input.headline,
  summary: input.summary,
  article_body: bodySlice,
  seo_title: input.seo_title,
  seo_description: input.seo_description,
  tags: input.tags ?? [],
})}

Return JSON only:
{
  "headline": "...",
  "summary": "...",
  "article_body": "markdown sections preserved",
  "seo_title": "...",
  "seo_description": "...",
  "tags": ["..."]
}`;

  const cached = await lookupPromptCache({
    system,
    user: userContent,
    operation: "translation",
    worker: "translation",
    articleId: input.articleId,
  });
  if (cached.hit && cached.result) {
    try {
      const parsed = JSON.parse(cached.result) as LlmTranslationResponse;
      const headline = parsed.headline?.trim();
      const summary = parsed.summary?.trim();
      if (headline && summary) {
        const article_body = parsed.article_body?.trim() || input.article_body;
        const mins = estimateMinutes(article_body);
        const cachedBundle: ArticleLocaleBundle = {
          headline,
          summary,
          article_body,
          seo_title: (parsed.seo_title?.trim() || headline).slice(0, 70),
          seo_description: (parsed.seo_description?.trim() || summary).slice(0, 165),
          tags: Array.isArray(parsed.tags)
            ? parsed.tags.map((t) => String(t).trim()).filter(Boolean)
            : input.tags,
          reading_time: readingTimeLabel(mins, input.targetLanguage),
          translated_at: new Date().toISOString(),
          model: process.env.NEWSROOM_TRANSLATION_MODEL?.trim() || "gpt-4o-mini",
          tone_profile: getRegionalToneProfile(input.targetLanguage).id,
        };
        return input.sourceContentVersion
          ? withSourceContentVersion(cachedBundle, input.sourceContentVersion)
          : cachedBundle;
      }
    } catch {
      /* cache parse failed — fall through */
    }
  }

  const body = {
    model:
      process.env.NEWSROOM_TRANSLATION_MODEL?.trim() ||
      process.env.NEWSROOM_EDITORIAL_MODEL?.trim() ||
      "gpt-4o-mini",
    temperature: 0.25,
    max_tokens: maxTokens,
    response_format: { type: "json_object" as const },
    messages: [
      { role: "system", content: system },
      {
        role: "user",
        content: userContent,
      },
    ],
  };

  try {
    const started = Date.now();
    const res = await fetch(OPENAI_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(90_000),
    });

    const latencyMs = Date.now() - started;

    if (!res.ok) {
      recordDirectChatCompletion({
        operation: "translation",
        model: body.model,
        system,
        user: userContent,
        latencyMs,
        success: false,
        context: { worker: "translation", articleId: input.articleId },
      });
      return null;
    }
    const json = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const text = json.choices?.[0]?.message?.content?.trim();
    recordDirectChatCompletion({
      operation: "translation",
      model: body.model,
      system,
      user: body.messages[1]!.content as string,
      json,
      content: text,
      latencyMs,
      success: Boolean(text),
      context: { worker: "translation", articleId: input.articleId },
    });
    if (!text) return null;

    const parsed = JSON.parse(text) as LlmTranslationResponse;
    const headline = parsed.headline?.trim();
    const summary = parsed.summary?.trim();
    if (!headline || !summary) return null;

    void storePromptCache({
      system,
      user: userContent,
      operation: "translation",
      worker: "translation",
      articleId: input.articleId,
      model: body.model,
      result: text,
      inputTokens: 0,
      outputTokens: 0,
      estimatedCostUsd: buildUsageRecord({
        operation: "translation",
        endpoint: "chat.completions",
        model: body.model,
        inputTokens: 0,
        outputTokens: 0,
        success: true,
      }).estimatedCostUsd,
    });

    const article_body = parsed.article_body?.trim() || input.article_body;
    const mins = estimateMinutes(article_body);
    const tags = Array.isArray(parsed.tags)
      ? parsed.tags.map((t) => String(t).trim()).filter(Boolean)
      : input.tags;

    const translated: ArticleLocaleBundle = {
      headline,
      summary,
      article_body,
      seo_title: (parsed.seo_title?.trim() || headline).slice(0, 70),
      seo_description: (parsed.seo_description?.trim() || summary).slice(0, 165),
      tags: tags?.length ? tags : input.tags,
      reading_time: readingTimeLabel(mins, input.targetLanguage),
      translated_at: new Date().toISOString(),
      model: body.model,
      tone_profile: getRegionalToneProfile(input.targetLanguage).id,
    };
    return input.sourceContentVersion
      ? withSourceContentVersion(translated, input.sourceContentVersion)
      : translated;
  } catch {
    return null;
  }
}

export async function translateGeneratedArticle(
  row: GeneratedArticleRow,
  targets?: NewsroomLanguage[],
  options?: {
    urgencyScore?: number | null;
    sourceContentVersion?: string;
  }
): Promise<TranslationJobResult[]> {
  const source = normalizeArticleLanguage(row.language);
  const langs = (targets ?? parseTranslationTargets()).filter(
    (t) => t !== source
  );

  const results: TranslationJobResult[] = [];
  const existing = getArticleTranslations(
    row.editorial_metadata,
    row.translations as ArticleTranslations | null
  );
  const urgencyScore = resolveTranslationUrgencyScore({
    payloadUrgency: options?.urgencyScore,
    editorialMetadata: row.editorial_metadata,
  });
  const sourceContentVersion =
    options?.sourceContentVersion ?? computeSourceContentVersion(row);

  for (const lang of langs) {
    const bundle = await translateArticleBundle({
      headline: row.headline,
      summary: row.summary ?? "",
      article_body: row.article_body ?? "",
      seo_title: row.seo_title ?? row.headline,
      seo_description: row.seo_description ?? row.summary ?? "",
      tags: row.tags ?? [],
      sourceLanguage: source,
      targetLanguage: lang,
      articleId: row.id,
      urgencyScore,
      sourceContentVersion,
    });

    if (!bundle) {
      results.push({ language: lang, ok: false, error: "translation_failed" });
      continue;
    }

    existing[lang] = bundle;
    results.push({ language: lang, ok: true });
  }

  if (results.some((r) => r.ok)) {
    await persistArticleTranslations(row.id, existing, row.editorial_metadata);
  }

  logMultilingualAnalytics({
    articleId: row.id,
    source,
    translated: results.filter((r) => r.ok).map((r) => r.language),
    failed: results.filter((r) => !r.ok).map((r) => r.language),
  });

  return results;
}

export async function persistArticleTranslations(
  articleId: string,
  translations: ArticleTranslations,
  editorial_metadata: GeneratedArticleRow["editorial_metadata"]
): Promise<void> {
  const supabase = createAdminServerClient();
  // Column is canonical; metadata mirror kept for backward-compatible readers.
  await supabase
    .from("generated_articles")
    .update({
      translations: asJson(translations),
      editorial_metadata: asJson({
        ...editorial_metadata,
        translations,
        translations_updated_at: new Date().toISOString(),
      }),
    })
    .eq("id", articleId);
}

export function logMultilingualAnalytics(payload: Record<string, unknown>): void {
  console.log("[MULTILINGUAL_ANALYTICS]", JSON.stringify({
    ts: new Date().toISOString(),
    ...payload,
  }));
}
