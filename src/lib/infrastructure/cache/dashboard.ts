/**
 * Dashboard snapshot caching — reduces expensive aggregate queries
 */

import { cacheGetJson, cacheSetJson } from "@/lib/infrastructure/cache";
import { INFRA_CONFIG } from "@/lib/infrastructure/config";

const TTL_SEC = Number(process.env.DASHBOARD_CACHE_TTL_SEC) || 45;

export function dashboardCacheKey(tenantId: string, segment: string): string {
  return `ops:dashboard:${tenantId}:${segment}:v1`;
}

export async function getCachedDashboard<T>(
  tenantId: string,
  segment: string
): Promise<T | null> {
  return cacheGetJson<T>(dashboardCacheKey(tenantId, segment));
}

export async function setCachedDashboard<T>(
  tenantId: string,
  segment: string,
  value: T
): Promise<void> {
  await cacheSetJson(dashboardCacheKey(tenantId, segment), value, TTL_SEC);
}

export async function getOrBuildDashboard<T>(
  tenantId: string,
  segment: string,
  builder: () => Promise<T>
): Promise<{ data: T; cached: boolean }> {
  const hit = await getCachedDashboard<T>(tenantId, segment);
  if (hit) return { data: hit, cached: true };

  const data = await builder();
  await setCachedDashboard(tenantId, segment, data);
  return { data, cached: false };
}

export const DASHBOARD_CACHE_META = {
  ttlSec: TTL_SEC,
  redisEnabled: INFRA_CONFIG.redisEnabled,
} as const;
