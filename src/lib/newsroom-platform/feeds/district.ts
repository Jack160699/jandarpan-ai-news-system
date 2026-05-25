import type { FeedPage, PlatformArticle } from "../content/types";
import { getPlatformDistrict, isPlatformDistrictSlug } from "../config/districts";
import { mockArticlesByDistrict } from "../content/mock/articles";
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
  const useMock = options.useMock ?? true;

  if (!isPlatformDistrictSlug(options.district)) {
    return {
      items: [],
      total: 0,
      page,
      pageSize,
      fetchedAt: new Date().toISOString(),
      source: "mock",
      district: options.district,
      liveCount: 0,
    };
  }

  const meta = getPlatformDistrict(options.district)!;

  if (!useMock) {
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
  const liveCount = slice.filter((a) => a.breaking).length;

  return {
    items: slice,
    total: sorted.length,
    page,
    pageSize,
    fetchedAt: new Date().toISOString(),
    source: "mock",
    district: meta.slug,
    liveCount,
  };
}

export function countDistrictStories(district: string): number {
  if (!isPlatformDistrictSlug(district)) return 0;
  return mockArticlesByDistrict(district).length;
}

export const districtRevalidate = ISR.district;
