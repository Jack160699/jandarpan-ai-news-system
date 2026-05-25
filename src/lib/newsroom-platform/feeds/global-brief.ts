import type { FeedPage, GlobalBriefSegment, PlatformArticle } from "../content/types";
import { mockArticlesByCategory } from "../content/mock/articles";
import { sortByTrending } from "../content/validate";
import { ISR } from "../config/isr";

export type GlobalBriefFeedOptions = {
  segment: GlobalBriefSegment;
  page?: number;
  pageSize?: number;
  useMock?: boolean;
};

export async function fetchGlobalBriefFeed(
  options: GlobalBriefFeedOptions
): Promise<FeedPage<PlatformArticle> & { segment: GlobalBriefSegment; liveCount: number }> {
  const page = options.page ?? 1;
  const pageSize = options.pageSize ?? 8;
  const useMock = options.useMock ?? true;

  const category =
    options.segment === "national" ? "national_news" : "international_news";

  if (!useMock) {
    return {
      items: [],
      total: 0,
      page,
      pageSize,
      fetchedAt: new Date().toISOString(),
      source: "supabase",
      segment: options.segment,
      liveCount: 0,
    };
  }

  const sorted = sortByTrending(mockArticlesByCategory(category));
  const start = (page - 1) * pageSize;
  const slice = sorted.slice(start, start + pageSize);

  return {
    items: slice,
    total: sorted.length,
    page,
    pageSize,
    fetchedAt: new Date().toISOString(),
    source: "mock",
    segment: options.segment,
    liveCount: slice.filter((a) => a.breaking).length,
  };
}

export function countGlobalBriefSegment(segment: GlobalBriefSegment): number {
  const category = segment === "national" ? "national_news" : "international_news";
  return mockArticlesByCategory(category).length;
}

export const globalBriefRevalidate = ISR.globalBrief;
