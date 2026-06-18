"use client";

import { useEffect, useMemo, useState } from "react";
import { normalizeAppLanguage } from "@/lib/i18n/safe-language";
import {
  hasValidHomeLead,
  homeDebug,
  normalizeHomepageFeed,
} from "@/lib/homepage/feed-safety";
import type { GeneratedHomepageFeed } from "@/lib/homepage/types";
import { useLanguage } from "@/providers/LanguageProvider";

/**
 * Homepage feed — server builds language-specific snapshots; client normalizes only.
 * Language changes trigger router.refresh() for a new server feed.
 */
export function useLocalizedFeed(
  feed: GeneratedHomepageFeed | null | undefined
): GeneratedHomepageFeed | null {
  const { language, ready, contentLocked, mounted: langMounted } = useLanguage();
  const safeLang = normalizeAppLanguage(language) || "hi";
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

    homeDebug("useLocalizedFeed server snapshot", {
      language: safeLang,
      articles: base.trending.length + base.liveWire.length,
      hasLead: hasValidHomeLead(base),
    });
    return base;
  }, [feed, safeLang, ready, mounted, langMounted, contentLocked]);
}
