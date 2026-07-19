/**
 * ISR + on-demand revalidation strategy
 */

import { revalidatePath, revalidateTag } from "next/cache";
import { logIngestionAnalytics } from "@/lib/infrastructure/analytics/ingestion";
import { invalidateHomepageRedisCaches } from "@/lib/infrastructure/cache/invalidate-homepage-redis";
import { LIVE_NEWS_CACHE_TAG } from "@/lib/news/home-ranking";

export const ISR_TAGS = {
  homepage: LIVE_NEWS_CACHE_TAG,
  homepageFeed: "homepage-feed",
  stories: "generated-stories",
  categories: "category-hubs",
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
    revalidateTag(ISR_TAGS.categories, "default");
    if ((options?.publishedStories ?? 0) > 0) {
      revalidateTag(ISR_TAGS.stories, "default");
      revalidatePath("/story", "layout");
    }
    revalidatePath(ISR_PATHS.home);
    revalidatePath("/category", "layout");
    revalidatePath(ISR_PATHS.sitemap);

    // Phase 6: drop warm in-process sitemap / pool-summary snapshots on publish.
    const { clearMainSitemapCache } = await import("@/lib/seo/sitemap-data");
    const { clearGeneratedPoolSummaryCache } = await import(
      "@/lib/newsroom/generated/pool-summary"
    );
    clearMainSitemapCache();
    clearGeneratedPoolSummaryCache();

    const redisInvalidation = await invalidateHomepageRedisCaches();

    logIngestionAnalytics({
      event: "revalidate",
      metadata: {
        tags: Object.values(ISR_TAGS),
        publishedStories: options?.publishedStories ?? 0,
        homepageRedisKeysDeleted: redisInvalidation.keysDeleted,
        homepageTenantsInvalidated: redisInvalidation.tenantCount,
      },
    });
  } catch (err) {
    logIngestionAnalytics({
      event: "degraded",
      error: err instanceof Error ? err.message : "revalidate_failed",
    });
  }
}
