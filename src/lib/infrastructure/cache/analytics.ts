/**
 * Analytics report caching
 */

import { cacheGetJson, cacheSetJson } from "@/lib/infrastructure/cache";

const TTL_SEC = Number(process.env.ANALYTICS_CACHE_TTL_SEC) || 120;

function key(tenantId: string, hours: number, enterprise: boolean): string {
  return `ops:analytics:${tenantId}:${hours}:${enterprise ? "ent" : "std"}:v1`;
}

export async function getCachedAnalyticsReport<T>(
  tenantId: string,
  hours: number,
  enterprise: boolean
): Promise<T | null> {
  return cacheGetJson<T>(key(tenantId, hours, enterprise));
}

export async function setCachedAnalyticsReport<T>(
  tenantId: string,
  hours: number,
  enterprise: boolean,
  report: T
): Promise<void> {
  await cacheSetJson(key(tenantId, hours, enterprise), report, TTL_SEC);
}

export const ANALYTICS_CACHE_TTL_SEC = TTL_SEC;
