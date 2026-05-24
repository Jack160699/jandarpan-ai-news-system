"use client";

import { useEffect, useMemo, useState } from "react";
import { localizeGeneratedFeed } from "@/lib/i18n/strict-locale";
import { normalizeAppLanguage } from "@/lib/i18n/safe-language";
import {
  ensureHomepageFeed,
  hasValidHomeLead,
  homeDebug,
} from "@/lib/homepage/feed-safety";
import type { GeneratedHomepageFeed } from "@/lib/homepage/types";
import { useLanguage } from "@/providers/LanguageProvider";

/**
 * Client-side locale pass — never blocks homepage render.
 * Shows server feed first; applies strict filter only after hydration + gate dismissed.
 */
export function useLocalizedFeed(
  feed: GeneratedHomepageFeed | null | undefined
): GeneratedHomepageFeed | null {
  const { language, ready, contentLocked } = useLanguage();
  const safeLang = normalizeAppLanguage(language);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    homeDebug("useLocalizedFeed mounted", { language: safeLang, ready });
  }, [safeLang, ready]);

  return useMemo(() => {
    if (!feed) return null;

    if (!mounted || !ready || contentLocked) {
      homeDebug("useLocalizedFeed passthrough (pre-hydration or gate)", {
        mounted,
        ready,
        contentLocked,
      });
      return feed;
    }

    try {
      const localized = localizeGeneratedFeed(feed, safeLang);
      const result = ensureHomepageFeed(feed, localized);
      homeDebug("useLocalizedFeed applied", {
        language: safeLang,
        articles: result.trending.length + result.liveWire.length,
        hasLead: hasValidHomeLead(result),
      });
      return result;
    } catch (err) {
      console.error("[useLocalizedFeed]", err);
      return feed;
    }
  }, [feed, safeLang, ready, mounted, contentLocked]);
}
