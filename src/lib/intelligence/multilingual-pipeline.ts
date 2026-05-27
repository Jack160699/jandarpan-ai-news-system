/**
 * Multilingual AI publishing pipeline status
 */

import { DEFAULT_TRANSLATION_TARGETS } from "@/lib/i18n/multilingual/translate";
import type { MultilingualPipelineStatus } from "@/lib/intelligence/types";
import type { Json } from "@/types/supabase";
import { jsonObjectFrom } from "@/types/json";

type ArticleTranslationRow = {
  translations?: Json | null;
  language: string | null;
  updated_at?: string | null;
};

export function getMultilingualPipelineStatus(
  articles: ArticleTranslationRow[]
): MultilingualPipelineStatus {
  const targets =
    process.env.NEWSROOM_TRANSLATE_LANGS?.split(",").map((s) => s.trim()) ??
    DEFAULT_TRANSLATION_TARGETS;

  const enabled = Boolean(process.env.OPENAI_API_KEY?.trim());
  let pendingCount = 0;
  let completedCount = 0;
  let lastTranslatedAt: string | null = null;

  for (const a of articles) {
    const trans = jsonObjectFrom(a.translations);
    const locales = Object.keys(trans).filter((k) => k !== "meta");
    const missing = targets.filter((t) => t !== a.language && !locales.includes(t));
    if (missing.length > 0) pendingCount += 1;
    else completedCount += 1;

    for (const loc of locales) {
      const bundle = trans[loc] as { translated_at?: string } | undefined;
      if (bundle?.translated_at) {
        if (!lastTranslatedAt || bundle.translated_at > lastTranslatedAt) {
          lastTranslatedAt = bundle.translated_at;
        }
      }
    }
  }

  return {
    enabled,
    targetLanguages: targets,
    pendingCount,
    completedCount,
    lastTranslatedAt,
  };
}

export { DEFAULT_TRANSLATION_TARGETS };
