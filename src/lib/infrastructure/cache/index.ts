/**
 * Unified cache — Redis first, memory fallback
 */

import { logIngestionAnalytics } from "@/lib/infrastructure/analytics/ingestion";
import { memoryCacheDelete, memoryCacheGet, memoryCacheSet } from "@/lib/infrastructure/cache/memory";
import { isRedisConfigured, redisDel, redisGet, redisSet } from "@/lib/infrastructure/cache/redis";

/** True when Redis is configured but unreachable — APIs continue via memory/DB */
let redisDegradedLogged = false;

export function isRedisDegradedMode(): boolean {
  return isRedisConfigured() && redisDegradedLogged;
}

export async function cacheGet(key: string): Promise<string | null> {
  if (isRedisConfigured()) {
    try {
      const hit = await redisGet(key);
      if (hit !== null) {
        logIngestionAnalytics({ event: "cache_hit", metadata: { key, layer: "redis" } });
        return hit;
      }
    } catch {
      if (!redisDegradedLogged) {
        redisDegradedLogged = true;
        logIngestionAnalytics({ event: "degraded", metadata: { layer: "redis", reason: "read_failure" } });
      }
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
    try {
      await redisSet(key, value, ttlSeconds);
    } catch {
      if (!redisDegradedLogged) {
        redisDegradedLogged = true;
        logIngestionAnalytics({ event: "degraded", metadata: { layer: "redis", reason: "write_failure" } });
      }
    }
  }
}

export async function cacheDelete(key: string): Promise<void> {
  memoryCacheDelete(key);
  if (isRedisConfigured()) {
    await redisDel(key);
  }
}

export async function cacheDeleteMany(keys: readonly string[]): Promise<void> {
  const unique = [...new Set(keys.filter(Boolean))];
  if (!unique.length) return;

  for (const key of unique) {
    memoryCacheDelete(key);
  }

  if (isRedisConfigured()) {
    await Promise.all(unique.map((key) => redisDel(key)));
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
  intelligenceSnapshot: "ops:intelligence:snapshot",
  analyticsReport: "ops:analytics:report",
  dashboardSnapshot: "ops:dashboard:snapshot",
  opsMetrics: "ops:metrics",
  opsErrors: "ops:errors:recent",
} as const;

export { NEWS_CACHE_KEYS } from "@/lib/infrastructure/cache/keys";
export { checkRateLimit, rateLimitHeaders } from "@/lib/infrastructure/cache/rate-limit";
export { withDedup, isDuplicateRequest } from "@/lib/infrastructure/cache/dedup";
export {
  getOrBuildDashboard,
  getCachedDashboard,
  setCachedDashboard,
  DASHBOARD_CACHE_META,
} from "@/lib/infrastructure/cache/dashboard";
export {
  getCachedAnalyticsReport,
  setCachedAnalyticsReport,
  ANALYTICS_CACHE_TTL_SEC,
} from "@/lib/infrastructure/cache/analytics";
export {
  getOrBuildHomepageFeed,
  getCachedHomepageFeed,
  setCachedHomepageFeed,
} from "@/lib/infrastructure/cache/homepage";
