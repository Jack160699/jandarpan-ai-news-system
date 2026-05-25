"use client";

import { useEffect, useMemo, useState } from "react";
import { localizeGeneratedFeed } from "@/lib/i18n/strict-locale";
import { normalizeAppLanguage } from "@/lib/i18n/safe-language";
import {
  ensureHomepageFeed,
  hasValidHomeLead,
  homeDebug,
  normalizeHomepageFeed,
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
  const { language, ready, contentLocked, mounted: langMounted } = useLanguage();
  const safeLang = normalizeAppLanguage(language) || "en";
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    homeDebug("useLocalizedFeed mounted", { language: safeLang, ready });
  }, [safeLang, ready]);

  return useMemo(() => {
    const base = normalizeHomepageFeed(feed);
    if (!base) return null;

    if (!mounted || !langMounted || !ready || contentLocked) {
      homeDebug("useLocalizedFeed passthrough", {
        mounted,
        langMounted,
        ready,
        contentLocked,
      });
      return base;
    }

    try {
      const localized = localizeGeneratedFeed(base, safeLang);
      const result = ensureHomepageFeed(base, localized);
      homeDebug("useLocalizedFeed applied", {
        language: safeLang,
        articles: result.trending.length + result.liveWire.length,
        hasLead: hasValidHomeLead(result),
      });
      return result;
    } catch (err) {
      console.error("[useLocalizedFeed]", err);
      return base;
    }
  }, [feed, safeLang, ready, mounted, langMounted, contentLocked]);
}
