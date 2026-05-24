"use client";

import { useMemo } from "react";
import { localizeGeneratedFeed } from "@/lib/i18n/strict-locale";
import { normalizeAppLanguage } from "@/lib/i18n/safe-language";
import type { GeneratedHomepageFeed } from "@/lib/homepage/types";
import { useLanguage } from "@/providers/LanguageProvider";

/** Client-side strict locale pass on server feed (sync with cookie after refresh) */
export function useLocalizedFeed(
  feed: GeneratedHomepageFeed | null | undefined
): GeneratedHomepageFeed | null {
  const { language, ready } = useLanguage();
  const safeLang = normalizeAppLanguage(language);

  return useMemo(() => {
    if (!feed) return null;
    if (!ready) return feed;
    try {
      return localizeGeneratedFeed(feed, safeLang);
    } catch (err) {
      console.error("[useLocalizedFeed]", err);
      return feed;
    }
  }, [feed, safeLang, ready]);
}
