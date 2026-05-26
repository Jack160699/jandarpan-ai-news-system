import { isSupabaseConfigured } from "@/lib/supabase";
import type { FeedPage, PlatformArticle } from "../content/types";
import { getPlatformDistrict } from "../config/districts";
import { queryArticles, queryGeneratedAsPlatform } from "../db/queries";
import { articleRowToPlatform } from "../db/types-map";
import { sortByTrending } from "../content/validate";
import { ISR } from "../config/isr";

export type DistrictFeedOptions = {
  district: string;
  page?: number;
  pageSize?: number;
  section?: string;
  useMock?: boolean;
};

export async function fetchDistrictFeed(
  options: DistrictFeedOptions
): Promise<FeedPage<PlatformArticle> & { district: string; liveCount: number }> {
  const page = options.page ?? 1;
  const pageSize = options.pageSize ?? 12;
  const useMock = options.useMock ?? false;

  const meta = await getPlatformDistrict(options.district);
  if (!meta) {
    return {
      items: [],
      total: 0,
      page,
      pageSize,
      fetchedAt: new Date().toISOString(),
      source: "supabase",
      district: options.district,
      liveCount: 0,
    };
  }

  if (useMock || !isSupabaseConfigured()) {
    const { mockArticlesByDistrict } = await import("../content/mock/articles");
    let items = mockArticlesByDistrict(options.district);
    if (options.section && options.section !== "top") {
      const key = options.section.toLowerCase();
      items = items.filter(
        (a) =>
          a.tags.some((t) => t.includes(key)) ||
          a.category.includes(key) ||
          (key === "crime" && a.tags.includes("safety"))
      );
    }
    const sorted = sortByTrending(items);
    const start = (page - 1) * pageSize;
    const slice = sorted.slice(start, start + pageSize);
    return {
      items: slice,
      total: sorted.length,
      page,
      pageSize,
      fetchedAt: new Date().toISOString(),
      source: "mock",
      district: meta.slug,
      liveCount: slice.filter((a) => a.breaking).length,
    };
  }

  const offset = (page - 1) * pageSize;
  const [platformRows, generatedItems] = await Promise.all([
    queryArticles({ district: options.district, limit: pageSize + 20, offset }),
    queryGeneratedAsPlatform({
      district: options.district,
      limit: pageSize + 20,
      offset,
    }),
  ]);

  let items = [
    ...platformRows.map(articleRowToPlatform),
    ...generatedItems,
  ];

  if (options.section && options.section !== "top") {
    const key = options.section.toLowerCase();
    items = items.filter(
      (a) =>
        a.tags.some((t) => t.includes(key)) ||
        a.category.includes(key) ||
        (key === "crime" && a.tags.includes("safety"))
    );
  }

  const sorted = sortByTrending(items);
  const start = 0;
  const slice = sorted.slice(start, pageSize);
  const liveCount = slice.filter((a) => a.breaking).length;

  return {
    items: slice,
    total: sorted.length,
    page,
    pageSize,
    fetchedAt: new Date().toISOString(),
    source: "supabase",
    district: meta.slug,
    liveCount,
  };
}

export async function countDistrictStories(district: string): Promise<number> {
  const feed = await fetchDistrictFeed({
    district,
    page: 1,
    pageSize: 1,
    useMock: !isSupabaseConfigured(),
  });
  return feed.total;
}

export const districtRevalidate = ISR.district;
