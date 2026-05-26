import { isSupabaseConfigured } from "@/lib/supabase";
import type { FeedPage, GlobalBriefSegment, PlatformArticle } from "../content/types";
import { queryArticles, queryGeneratedAsPlatform } from "../db/queries";
import { articleRowToPlatform } from "../db/types-map";
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
  const useMock = options.useMock ?? false;

  const category =
    options.segment === "national" ? "national_news" : "international_news";

  if (useMock || !isSupabaseConfigured()) {
    const { mockArticlesByCategory } = await import("../content/mock/articles");
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

  const offset = (page - 1) * pageSize;
  const platformRows = await queryArticles({
    category,
    limit: pageSize,
    offset,
  });
  const generated = await queryGeneratedAsPlatform({ limit: pageSize, offset });
  const items = [
    ...platformRows.map(articleRowToPlatform),
    ...generated.filter((g) => g.category === category),
  ];
  const sorted = sortByTrending(items);
  const slice = sorted.slice(0, pageSize);

  return {
    items: slice,
    total: sorted.length,
    page,
    pageSize,
    fetchedAt: new Date().toISOString(),
    source: "supabase",
    segment: options.segment,
    liveCount: slice.filter((a) => a.breaking).length,
  };
}

export async function countGlobalBriefSegment(
  segment: GlobalBriefSegment
): Promise<number> {
  const feed = await fetchGlobalBriefFeed({
    segment,
    page: 1,
    pageSize: 1,
    useMock: !isSupabaseConfigured(),
  });
  return feed.total;
}

export const globalBriefRevalidate = ISR.globalBrief;
