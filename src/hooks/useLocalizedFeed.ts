"use client";

import { useMemo } from "react";
import { localizeGeneratedFeed } from "@/lib/i18n/strict-locale";
import type { GeneratedHomepageFeed } from "@/lib/homepage/types";
import { useLanguage } from "@/providers/LanguageProvider";

/** Client-side strict locale pass on server feed (sync with cookie after refresh) */
export function useLocalizedFeed(
  feed: GeneratedHomepageFeed | null | undefined
): GeneratedHomepageFeed | null {
  const { language, ready } = useLanguage();

  return useMemo(() => {
    if (!feed || !ready) return feed ?? null;
    return localizeGeneratedFeed(feed, language);
  }, [feed, language, ready]);
}
