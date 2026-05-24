/**
 * Edge micro-cache — homepage / breaking / regional slices (60–120s TTL).
 */

import { AGGREGATION_CONFIG } from "@/lib/news/aggregation/config";
import { cacheGetJson, cacheSetJson } from "@/lib/infrastructure/cache";
import { NEWS_CACHE_KEYS } from "@/lib/infrastructure/cache/keys";
import { recordCacheHit, recordCacheMiss } from "@/lib/news/live-feed/observability";
import type { GeneratedHomepageFeed } from "@/lib/homepage/types";
import type { HomeArticle } from "@/lib/homepage/types";

type SegmentPayload<T> = { data: T; cachedAt: string };

export async function writeFeedSegmentCaches(
  feed: GeneratedHomepageFeed
): Promise<void> {
  const cachedAt = new Date().toISOString();
  const wrap = <T>(data: T): SegmentPayload<T> => ({ data, cachedAt });

  await Promise.all([
    cacheSetJson(
      NEWS_CACHE_KEYS.homepage,
      wrap({
        trending: feed.trending,
        liveWire: feed.liveWire,
        editorsPicks: feed.editorsPicks,
        fetchedAt: feed.fetchedAt,
      }),
      AGGREGATION_CONFIG.homepageMicroCacheTtlSec
    ),
    cacheSetJson(
      NEWS_CACHE_KEYS.breaking,
      wrap(feed.breakingTicker),
      AGGREGATION_CONFIG.breakingMicroCacheTtlSec
    ),
    cacheSetJson(
      NEWS_CACHE_KEYS.regional,
      wrap(feed.regionalHighlights),
      AGGREGATION_CONFIG.regionalMicroCacheTtlSec
    ),
  ]);
}

export async function readBreakingSegmentCache(): Promise<HomeArticle[] | null> {
  const hit = await cacheGetJson<SegmentPayload<HomeArticle[]>>(
    NEWS_CACHE_KEYS.breaking
  );
  if (hit?.data?.length) {
    recordCacheHit("breaking");
    return hit.data;
  }
  recordCacheMiss("breaking");
  return null;
}
