/**
 * Edge micro-cache — homepage / breaking / regional slices (60–120s TTL).
 * Phase 8: tenant-scoped keys with legacy global fallback for reads.
 */

import { AGGREGATION_CONFIG } from "@/lib/news/aggregation/config";
import { cacheGetJson, cacheSetJson } from "@/lib/infrastructure/cache";
import { NEWS_CACHE_KEYS } from "@/lib/infrastructure/cache/keys";
import { sanitizeCacheKeySegment } from "@/lib/infrastructure/cache/tenant-keys";
import { recordCacheHit, recordCacheMiss } from "@/lib/news/live-feed/observability";
import type { GeneratedHomepageFeed } from "@/lib/homepage/types";
import type { HomeArticle } from "@/lib/homepage/types";
import { getDefaultTenantSlug } from "@/lib/tenant/registry";

type SegmentPayload<T> = { data: T; cachedAt: string };

function segmentKey(
  base: string,
  tenantSlug: string | null | undefined
): string {
  const slug = sanitizeCacheKeySegment(tenantSlug?.trim() || getDefaultTenantSlug());
  return `${base}:t:${slug}`;
}

export async function writeFeedSegmentCaches(
  feed: GeneratedHomepageFeed,
  tenantSlug?: string | null
): Promise<void> {
  const cachedAt = new Date().toISOString();
  const wrap = <T>(data: T): SegmentPayload<T> => ({ data, cachedAt });
  const slug = tenantSlug ?? getDefaultTenantSlug();

  await Promise.all([
    cacheSetJson(
      segmentKey(NEWS_CACHE_KEYS.homepage, slug),
      wrap({
        trending: feed.trending,
        liveWire: feed.liveWire,
        editorsPicks: feed.editorsPicks,
        fetchedAt: feed.fetchedAt,
      }),
      AGGREGATION_CONFIG.homepageMicroCacheTtlSec
    ),
    cacheSetJson(
      segmentKey(NEWS_CACHE_KEYS.breaking, slug),
      wrap(feed.breakingTicker),
      AGGREGATION_CONFIG.breakingMicroCacheTtlSec
    ),
    cacheSetJson(
      segmentKey(NEWS_CACHE_KEYS.regional, slug),
      wrap(feed.regionalHighlights),
      AGGREGATION_CONFIG.regionalMicroCacheTtlSec
    ),
  ]);
}

export async function readBreakingSegmentCache(
  tenantSlug?: string | null
): Promise<HomeArticle[] | null> {
  const slug = tenantSlug ?? getDefaultTenantSlug();
  const scoped = await cacheGetJson<SegmentPayload<HomeArticle[]>>(
    segmentKey(NEWS_CACHE_KEYS.breaking, slug)
  );
  if (scoped?.data?.length) {
    recordCacheHit("breaking");
    return scoped.data;
  }

  // Legacy global key fallback (pre Phase 8)
  const legacy = await cacheGetJson<SegmentPayload<HomeArticle[]>>(
    NEWS_CACHE_KEYS.breaking
  );
  if (legacy?.data?.length) {
    recordCacheHit("breaking");
    return legacy.data;
  }

  recordCacheMiss("breaking");
  return null;
}
