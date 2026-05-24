import type { GeneratedHomepageFeed, HomeArticle } from "@/lib/homepage/types";

/** True when feed can safely render hero + ticker */
export function hasValidHomeLead(
  feed: GeneratedHomepageFeed | null | undefined
): feed is GeneratedHomepageFeed {
  const lead = feed?.editorsPicks?.lead;
  return Boolean(lead?.id && lead.headline?.trim());
}

export function countHomeArticles(feed: GeneratedHomepageFeed): number {
  return (
    feed.trending.length +
    feed.liveWire.length +
    feed.breakingTicker.length +
    (feed.editorsPicks.lead ? 1 : 0)
  );
}

/** Prefer localized feed; keep server snapshot if strict pass would blank the page */
export function ensureHomepageFeed(
  serverFeed: GeneratedHomepageFeed,
  localized: GeneratedHomepageFeed
): GeneratedHomepageFeed {
  if (hasValidHomeLead(localized) && countHomeArticles(localized) > 0) {
    return localized;
  }
  return serverFeed;
}

export function safeArticleRanking(article: HomeArticle | undefined | null): HomeArticle["ranking"] {
  return (
    article?.ranking ?? {
      priorityScore: 0,
      reasons: [],
      isTrending: false,
      isBreaking: false,
      duplicateClusterId: null,
    }
  );
}

const DEBUG =
  typeof process !== "undefined" &&
  process.env.NODE_ENV !== "production";

export function homeDebug(label: string, payload?: Record<string, unknown>) {
  if (!DEBUG) return;
  console.debug(`[homepage] ${label}`, payload ?? "");
}
