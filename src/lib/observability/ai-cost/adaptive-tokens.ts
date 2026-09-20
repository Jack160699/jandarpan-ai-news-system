/**
 * Dynamic max_tokens — allocate what each article type needs for complete reports
 */

import type { NewsroomLanguage } from "@/lib/i18n/languages";
import type { ArticleType } from "@/lib/news/ai/article-type";

export type EditorialContentTier = "breaking" | "regular" | "deep_analysis";

export function classifyEditorialTier(input: {
  urgencyScore?: number | null;
  signalCount?: number;
  factPackChars?: number;
  category?: string | null;
  articleType?: ArticleType | null;
}): EditorialContentTier {
  const urgency = input.urgencyScore ?? 50;
  const signals = input.signalCount ?? 1;
  const chars = input.factPackChars ?? 0;
  const cat = (input.category ?? "").toLowerCase();
  const articleType = input.articleType;

  if (
    articleType === "breaking_alert" ||
    urgency >= 75 ||
    cat === "breaking"
  ) {
    return "breaking";
  }
  if (
    articleType === "explainer" ||
    articleType === "analysis" ||
    signals >= 6 ||
    chars > 3500 ||
    cat === "analysis" ||
    cat === "investigation"
  ) {
    return "deep_analysis";
  }
  return "regular";
}

/**
 * Raised so body + intelligence_v2 JSON can coexist without truncating reports.
 * Override with OPENAI_EDITORIAL_MAX_TOKENS when needed.
 */
const EDITORIAL_MAX_TOKENS: Record<EditorialContentTier, number> = {
  breaking: 3600,
  regular: 4000,
  deep_analysis: 4800,
};

const EDITORIAL_MAX_TOKENS_BY_ARTICLE_TYPE: Partial<Record<ArticleType, number>> = {
  breaking_alert: 3600,
  short_update: 3600,
  standard_report: 4000,
  developing_story: 4000,
  service_information: 3600,
  live_continuing: 4000,
  explainer: 4800,
  analysis: 4800,
};

export function editorialMaxTokens(
  tier: EditorialContentTier,
  articleType?: ArticleType | null
): number {
  const override = process.env.OPENAI_EDITORIAL_MAX_TOKENS?.trim();
  if (override) {
    const n = Number(override);
    if (Number.isFinite(n) && n > 0) return n;
  }
  if (articleType && EDITORIAL_MAX_TOKENS_BY_ARTICLE_TYPE[articleType]) {
    return EDITORIAL_MAX_TOKENS_BY_ARTICLE_TYPE[articleType]!;
  }
  return EDITORIAL_MAX_TOKENS[tier];
}

export type TranslationBodyTier = "breaking" | "long_form" | "regular" | "short";

export function classifyTranslationBodyTier(input: {
  bodyChars: number;
  headline?: string;
  urgencyScore?: number | null;
}): TranslationBodyTier {
  if ((input.urgencyScore ?? 0) >= 75) return "breaking";
  if (input.bodyChars > 8000) return "long_form";
  if (input.bodyChars < 1500) return "short";
  return "regular";
}

const TRANSLATION_BODY_LIMITS: Record<TranslationBodyTier, number> = {
  breaking: 6000,
  long_form: 5000,
  regular: 3500,
  short: 2500,
};

export function translationBodyLimit(tier: TranslationBodyTier): number {
  return TRANSLATION_BODY_LIMITS[tier];
}

export function classifyTranslationBodyTierFromText(
  articleBody: string,
  urgencyScore?: number | null
): TranslationBodyTier {
  return classifyTranslationBodyTier({
    bodyChars: articleBody.length,
    urgencyScore,
  });
}

export function adaptiveTranslationBodySlice(
  articleBody: string,
  urgencyScore?: number | null
): string {
  const tier = classifyTranslationBodyTierFromText(articleBody, urgencyScore);
  const limit = translationBodyLimit(tier);
  return articleBody.slice(0, limit);
}

/** Output tokens scaled to input body size + target language expansion factor */
export function translationMaxTokens(input: {
  bodyChars: number;
  targetLanguage: NewsroomLanguage;
  tier?: TranslationBodyTier;
}): number {
  const tier = input.tier ?? classifyTranslationBodyTier({ bodyChars: input.bodyChars });
  const baseByTier: Record<TranslationBodyTier, number> = {
    short: 900,
    regular: 1400,
    breaking: 1800,
    long_form: 2200,
  };
  const langFactor =
    input.targetLanguage === "hi" || input.targetLanguage === "cg" ? 1.15 : 1.0;
  const raw = Math.ceil(baseByTier[tier] * langFactor);
  return Math.min(raw, 2400);
}

export function shortsMaxTokens(bodyChars: number): number {
  if (bodyChars < 800) return 600;
  if (bodyChars < 2000) return 750;
  return 900;
}

export function enrichMaxTokens(descriptionChars: number): number {
  if (descriptionChars < 200) return 280;
  if (descriptionChars < 600) return 350;
  return 400;
}

export function repairMaxTokens(): number {
  return Number(process.env.OPENAI_REPAIR_MAX_TOKENS) || 500;
}
