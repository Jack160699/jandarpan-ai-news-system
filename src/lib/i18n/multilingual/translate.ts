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
import { isAnyChatProviderConfigured, requestChatCompletion } from "@/lib/ai/providers";
import {
  computeSourceContentVersion,
  resolveTranslationUrgencyScore,
  withSourceContentVersion,
} from "@/lib/i18n/multilingual/translation-contract";
import {
  adaptiveTranslationBodySlice,
  classifyTranslationBodyTierFromText,
  translationMaxTokens,
} from "@/lib/observability/ai-cost/adaptive-tokens";
import {
  lookupPromptCache,
  storePromptCache,
} from "@/lib/observability/ai-cost/prompt-cache";
import { buildUsageRecord } from "@/lib/observability/ai-cost/record";
import { validateTranslationBundle } from "@/lib/i18n/multilingual/translation-quality";
import { buildTranslationLink, recordTranslationLinks, type TranslationLinkRow } from "@/lib/i18n/multilingual/translation-links";

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
  /** Called with the quality-gate codes when a translation is REJECTED (so callers can surface why). */
  onReject?: (codes: string[]) => void;
}): Promise<ArticleLocaleBundle | null> {
  if (!isAnyChatProviderConfigured()) return null;
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
Rules: translate EVERY paragraph completely - do not summarise, shorten or omit; keep the paragraph structure; keep proper nouns, numbers and quotes exact; write the output entirely in the target language and its native script (Hindi in Devanagari - only unavoidable acronyms/names may stay in Latin). Never return the source text unchanged.

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

  const gate = (bundle: { headline: string; summary: string; article_body: string }): boolean => {
    const q = validateTranslationBundle({
      targetLanguage: input.targetLanguage,
      source: { headline: input.headline, summary: input.summary, article_body: bodySlice, language: input.sourceLanguage },
      bundle,
    });
    if (q.ok) return true;
    console.warn("[translation] rejected " + JSON.stringify({ articleId: input.articleId ?? null, target: input.targetLanguage, codes: q.codes }));
    input.onReject?.(q.codes);
    return false;
  };

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
        // NO fallback to the source-language body: a missing translated body is a rejection, never a bilingual hybrid.
        const article_body = parsed.article_body?.trim() ?? "";
        if (!gate({ headline, summary, article_body })) return null;
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

  // Explicit override only — do not force an OpenAI-shaped default (e.g.
  // "gpt-4o-mini") onto gemini/groq/openrouter; each provider resolves its
  // own operation-appropriate default model when no override is given.
  const modelOverride =
    process.env.NEWSROOM_TRANSLATION_MODEL?.trim() ||
    process.env.NEWSROOM_EDITORIAL_MODEL?.trim() ||
    undefined;

  try {
    const result = await requestChatCompletion({
      operation: "translation",
      system,
      user: userContent,
      model: modelOverride,
      temperature: 0.25,
      maxTokens,
      jsonMode: true,
      timeoutMs: 90_000,
      cachePolicy: "bypass",
      context: { worker: "translation", articleId: input.articleId },
    });

    if (!result.ok) return null;

    const text = result.content.trim();
    if (!text) return null;

    const parsed = JSON.parse(text) as LlmTranslationResponse;
    const headline = parsed.headline?.trim();
    const summary = parsed.summary?.trim();
    if (!headline || !summary) return null;

    const modelLabel = modelOverride ?? result.provider;

    // NO fallback to the source-language body (see gate above): reject instead of storing a bilingual hybrid.
    const article_body = parsed.article_body?.trim() ?? "";
    if (!gate({ headline, summary, article_body })) return null;
    // Cache ONLY a translation that cleared the quality gate: a rejected one must never be replayed from cache on retry.
    void storePromptCache({
      system,
      user: userContent,
      operation: "translation",
      worker: "translation",
      articleId: input.articleId,
      model: modelLabel,
      result: text,
      inputTokens: 0,
      outputTokens: 0,
      estimatedCostUsd: buildUsageRecord({
        operation: "translation",
        endpoint: "chat.completions",
        model: modelLabel,
        inputTokens: 0,
        outputTokens: 0,
        success: true,
      }).estimatedCostUsd,
    });

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
      model: modelLabel,
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
  const isDevanagari = /[\u0900-\u097F]/.test(row.headline || "");
  const source: NewsroomLanguage = isDevanagari ? "hi" : "en";
  const defaultTargets: NewsroomLanguage[] = source === "hi" ? ["en"] : ["hi"];
  const targetList = targets ?? defaultTargets;
  const langs = targetList.filter((t) => t !== source);

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

  const links: TranslationLinkRow[] = [];
  for (const lang of langs) {
    let rejection: string[] | null = null;
    const bundle = await translateArticleBundle({
      onReject: (codes) => {
        rejection = codes;
      },
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
      // A quality-gate rejection is reported with its codes; the translation is NOT stored (and so never shown).
      results.push({ language: lang, ok: false, error: rejection ? `translation_rejected:${(rejection as string[]).join(",")}`.slice(0, 300) : "translation_failed" });
      continue;
    }

    existing[lang] = bundle;
    results.push({ language: lang, ok: true });
    const link = buildTranslationLink({ articleId: row.id, eventId: row.event_id, sourceLanguage: source, targetLanguage: lang });
    if (link) links.push(link);
  }

  if (results.some((r) => r.ok)) {
    await persistArticleTranslations(row.id, existing, row.editorial_metadata);
    await recordTranslationLinks(links);
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
