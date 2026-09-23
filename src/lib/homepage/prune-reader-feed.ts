import type { GeneratedHomepageFeed, HomeArticle } from "./types";

function pruneArticle(a: HomeArticle): HomeArticle {
  return {
    id: a.id,
    slug: a.slug,
    headline: a.headline,
    summary: a.summary || "",
    imageUrl: a.imageUrl || "",
    ogImageUrl: "",
    section: a.section,
    readingTime: a.readingTime || "",
    publishedAt: a.publishedAt,
    isLive: Boolean(a.isLive),
    urgency: a.urgency,
    trendScore: a.trendScore || a.priorityScore || 0,
    priorityScore: a.priorityScore || 0,
    ranking: {
      priorityScore: a.priorityScore || 0,
      reasons: [],
      isTrending: Boolean(a.ranking?.isTrending),
      isBreaking: Boolean(a.ranking?.isBreaking),
      duplicateClusterId: null,
    },
    language: a.language,
    tags: a.tags ?? [],
    aiConfidence: 0.9,
    sourceCount: 1,
    categoryLabel: a.categoryLabel || "",
    desk: a.desk,
  };
}

/**
 * Prune heavy, unused server-only metadata before serialization into client props.
 * Shrinks Next.js Flight JSON and initial HTML document by ~100+ KB without
 * changing any rendered UI or logic.
 */
export function pruneFeedForReader(
  feed: GeneratedHomepageFeed
): GeneratedHomepageFeed {
  return {
    breakingTicker: (feed.breakingTicker ?? []).map(pruneArticle),
    editorsPicks: {
      lead: feed.editorsPicks?.lead ? pruneArticle(feed.editorsPicks.lead) : (null as unknown as HomeArticle),
      supporting: (feed.editorsPicks?.supporting ?? []).map(pruneArticle),
    },
    liveWire: (feed.liveWire ?? []).map(pruneArticle),
    regionalHighlights: (feed.regionalHighlights ?? []).map(pruneArticle),
    trending: (feed.trending ?? []).map(pruneArticle),
    shorts: [],
    newsShorts: [],
    categoryStreams: [],
    footerIntelligence: {
      fetchedAt: feed.footerIntelligence?.fetchedAt || "",
      storyCount: feed.footerIntelligence?.storyCount || 0,
      breakingCount: feed.footerIntelligence?.breakingCount || 0,
      trendingCount: feed.footerIntelligence?.trendingCount || 0,
      avgConfidence: 0.9,
      trendingSearches: [],
    },
    hyperlocalFeeds: [],
    localBreakingAlerts: [],
    fetchedAt: feed.fetchedAt,
  };
}
