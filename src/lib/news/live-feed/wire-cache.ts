/**
 * Wire micro-cache + in-flight deduplication — Redis/memory, 60–120s TTL.
 */

import { AGGREGATION_CONFIG } from "@/lib/news/aggregation/config";
import { cacheGetJson, cacheSetJson } from "@/lib/infrastructure/cache";
import { NEWS_CACHE_KEYS } from "@/lib/infrastructure/cache/keys";
import { memoryCacheGet, memoryCacheSet } from "@/lib/infrastructure/cache/memory";
import {
  fetchWireArticlesUncached,
  type WireDisplayFetchResult,
} from "@/lib/news/live-feed/fetch-wire-display";
import {
  recordCacheHit,
  recordCacheMiss,
} from "@/lib/news/live-feed/observability";
import { logLiveFeed } from "@/lib/news/live-feed/logger";
import type { NormalizedArticle } from "@/lib/news/types";

type CachedWirePayload = {
  articles: NormalizedArticle[];
  cachedAt: string;
  errors: string[];
  rateLimited: boolean;
  providersAttempted: string[];
};

const INFLIGHT_KEY = "wire:homepage";

const g = globalThis as unknown as {
  __wireInflight?: Map<string, Promise<WireDisplayFetchResult>>;
};

function inflightMap(): Map<string, Promise<WireDisplayFetchResult>> {
  if (!g.__wireInflight) g.__wireInflight = new Map();
  return g.__wireInflight;
}

function isCacheEntryValid(payload: CachedWirePayload): boolean {
  const ageSec =
    (Date.now() - new Date(payload.cachedAt).getTime()) / 1000;
  return ageSec <= AGGREGATION_CONFIG.wireCacheStaleSec;
}

async function readWireCache(): Promise<CachedWirePayload | null> {
  const redis = await cacheGetJson<CachedWirePayload>(
    NEWS_CACHE_KEYS.wireNormalized
  );
  if (redis && isCacheEntryValid(redis)) return redis;

  const mem = memoryCacheGet(NEWS_CACHE_KEYS.wireNormalized);
  if (!mem) return null;
  try {
    const parsed = JSON.parse(mem) as CachedWirePayload;
    return isCacheEntryValid(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

async function writeWireCache(payload: CachedWirePayload): Promise<void> {
  const ttl = AGGREGATION_CONFIG.wireCacheTtlSec;
  memoryCacheSet(NEWS_CACHE_KEYS.wireNormalized, JSON.stringify(payload), ttl);
  await cacheSetJson(NEWS_CACHE_KEYS.wireNormalized, payload, ttl);
}

/**
 * Cached wire fetch — single in-flight per serverless instance, Redis across instances.
 */
export async function getWireArticlesCached(
  limit = 60
): Promise<WireDisplayFetchResult> {
  const cached = await readWireCache();
  if (cached) {
    recordCacheHit("wire");
    logLiveFeed("wire_cache_hit", {
      articles: cached.articles.length,
      ageSec: Math.round(
        (Date.now() - new Date(cached.cachedAt).getTime()) / 1000
      ),
    });
    return {
      articles: cached.articles.slice(0, limit),
      errors: cached.errors,
      rateLimited: cached.rateLimited,
      providersAttempted: cached.providersAttempted,
    };
  }

  recordCacheMiss("wire");

  const inflight = inflightMap();
  const existing = inflight.get(INFLIGHT_KEY);
  if (existing) {
    logLiveFeed("wire_inflight_join");
    return existing;
  }

  const promise = (async () => {
    const result = await fetchWireArticlesUncached(limit);
    if (result.articles.length > 0) {
      await writeWireCache({
        articles: result.articles,
        cachedAt: new Date().toISOString(),
        errors: result.errors,
        rateLimited: result.rateLimited,
        providersAttempted: result.providersAttempted,
      });
    }
    return result;
  })().finally(() => {
    inflight.delete(INFLIGHT_KEY);
  });

  inflight.set(INFLIGHT_KEY, promise);
  return promise;
}
