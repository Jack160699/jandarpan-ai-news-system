/**
 * Unified cache — Redis first, memory fallback
 */

import { logIngestionAnalytics } from "@/lib/infrastructure/analytics/ingestion";
import { memoryCacheDelete, memoryCacheGet, memoryCacheSet } from "@/lib/infrastructure/cache/memory";
import { isRedisConfigured, redisDel, redisGet, redisSet } from "@/lib/infrastructure/cache/redis";

export async function cacheGet(key: string): Promise<string | null> {
  if (isRedisConfigured()) {
    const hit = await redisGet(key);
    if (hit !== null) {
      logIngestionAnalytics({ event: "cache_hit", metadata: { key, layer: "redis" } });
      return hit;
    }
  }

  const mem = memoryCacheGet(key);
  if (mem !== null) {
    logIngestionAnalytics({ event: "cache_hit", metadata: { key, layer: "memory" } });
    return mem;
  }

  logIngestionAnalytics({ event: "cache_miss", metadata: { key } });
  return null;
}

export async function cacheSet(
  key: string,
  value: string,
  ttlSeconds: number
): Promise<void> {
  memoryCacheSet(key, value, ttlSeconds);
  if (isRedisConfigured()) {
    await redisSet(key, value, ttlSeconds);
  }
}

export async function cacheDelete(key: string): Promise<void> {
  memoryCacheDelete(key);
  if (isRedisConfigured()) {
    await redisDel(key);
  }
}

export async function cacheGetJson<T>(key: string): Promise<T | null> {
  const raw = await cacheGet(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function cacheSetJson<T>(
  key: string,
  value: T,
  ttlSeconds: number
): Promise<void> {
  await cacheSet(key, JSON.stringify(value), ttlSeconds);
}

export const CACHE_KEYS = {
  homepageFeed: "nr:homepage:feed:v1",
  providerHealth: "nr:providers:health:v1",
} as const;
