import type {
  GeneratedHomepageFeed,
  HomeArticle,
  EditorsPicksBlock,
} from "@/lib/homepage/types";

/** Guarantee arrays + editorsPicks exist — prevents post-hydration crashes */
export function normalizeHomepageFeed(
  feed: GeneratedHomepageFeed | null | undefined
): GeneratedHomepageFeed | null {
  if (!feed) return null;

  const lead = feed.editorsPicks?.lead;
  if (!lead) return null;

  const editorsPicks: EditorsPicksBlock = {
    lead,
    supporting: feed.editorsPicks?.supporting ?? [],
  };

  return {
    ...feed,
    breakingTicker: feed.breakingTicker ?? [],
    liveWire: feed.liveWire ?? [],
    trending: feed.trending ?? [],
    shorts: feed.shorts ?? [],
    newsShorts: feed.newsShorts ?? [],
    regionalHighlights: feed.regionalHighlights ?? [],
    categoryStreams: feed.categoryStreams ?? [],
    hyperlocalFeeds: feed.hyperlocalFeeds ?? [],
    localBreakingAlerts: feed.localBreakingAlerts ?? [],
    editorsPicks,
    footerIntelligence: feed.footerIntelligence ?? {
      fetchedAt: new Date().toISOString(),
      storyCount: 0,
      breakingCount: 0,
      trendingCount: 0,
      avgConfidence: 0,
      trendingSearches: [],
    },
  };
}

/** True when feed can safely render hero + ticker */
export function hasValidHomeLead(
  feed: GeneratedHomepageFeed | null | undefined
): feed is GeneratedHomepageFeed {
  const lead = feed?.editorsPicks?.lead;
  return Boolean(lead?.id && lead.headline?.trim());
}

export function countHomeArticles(feed: GeneratedHomepageFeed): number {
  return (
    (feed.trending?.length ?? 0) +
    (feed.liveWire?.length ?? 0) +
    (feed.breakingTicker?.length ?? 0) +
    (feed.editorsPicks?.lead ? 1 : 0)
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
