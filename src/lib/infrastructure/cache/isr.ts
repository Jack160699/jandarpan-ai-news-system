/**
 * ISR + on-demand revalidation strategy
 */

import { revalidatePath, revalidateTag } from "next/cache";
import { cacheDelete, CACHE_KEYS } from "@/lib/infrastructure/cache";
import { logIngestionAnalytics } from "@/lib/infrastructure/analytics/ingestion";
import { LIVE_NEWS_CACHE_TAG } from "@/lib/news/home-ranking";
import { CACHE_TAGS } from "@/lib/newsroom-platform/config/isr";

export const ISR_TAGS = {
  homepage: LIVE_NEWS_CACHE_TAG,
  homepageFeed: "homepage-feed",
  stories: "generated-stories",
  categories: "category-hubs",
  searchIndex: "news-search-index",
} as const;

export const ISR_PATHS = {
  home: "/",
  search: "/search",
  sitemap: "/sitemap.xml",
} as const;

/**
 * After ingestion / editorial publish — invalidate edge + data cache
 */
export async function revalidateNewsroomCaches(options?: {
  publishedStories?: number;
}): Promise<void> {
  try {
    revalidateTag(ISR_TAGS.homepage, "default");
    revalidateTag(ISR_TAGS.homepageFeed, "default");
    revalidateTag(CACHE_TAGS.breaking, "default");
    revalidateTag(CACHE_TAGS.homepage, "default");
    revalidateTag(ISR_TAGS.searchIndex, "default");
    if ((options?.publishedStories ?? 0) > 0) {
      revalidateTag(ISR_TAGS.stories, "default");
    }
    revalidatePath(ISR_PATHS.home);
    revalidatePath("/category", "layout");

    await cacheDelete(CACHE_KEYS.homepageFeed);

    logIngestionAnalytics({
      event: "revalidate",
      metadata: {
        tags: Object.values(ISR_TAGS),
        publishedStories: options?.publishedStories ?? 0,
      },
    });
  } catch (err) {
    logIngestionAnalytics({
      event: "degraded",
      error: err instanceof Error ? err.message : "revalidate_failed",
    });
  }
}
