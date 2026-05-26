/**
 * AI translation pipeline status and desk suggestions
 */

import type { MultilingualPipelineStatus } from "@/lib/intelligence/types";

export type TranslationSuggestion = {
  articleId: string;
  headline: string;
  targetLocale: string;
  reason: string;
  priority: "high" | "medium" | "low";
};

const TARGET_LOCALES = ["hi", "en"] as const;

export function suggestTranslations(input: {
  articles: Array<{
    id: string;
    headline: string;
    language: string | null;
    translations: Record<string, unknown> | null;
    region: string | null;
  }>;
}): TranslationSuggestion[] {
  const suggestions: TranslationSuggestion[] = [];

  for (const a of input.articles) {
    const keys = Object.keys(a.translations ?? {}).filter((k) => k !== "meta");
    const lang = (a.language ?? "hi").toLowerCase().slice(0, 2);

    for (const target of TARGET_LOCALES) {
      if (target === lang || keys.includes(target)) continue;
      suggestions.push({
        articleId: a.id,
        headline: a.headline,
        targetLocale: target,
        reason:
          target === "hi"
            ? "Hindi edition gap for regional audience"
            : "English edition for national syndication",
        priority: a.region ? "high" : "medium",
      });
    }
  }

  return suggestions.slice(0, 12);
}

export function mergeMultilingualStatus(
  base: MultilingualPipelineStatus,
  pendingTranslations: number
): MultilingualPipelineStatus {
  return {
    ...base,
    pendingCount: base.pendingCount + pendingTranslations,
  };
}
