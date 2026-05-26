/**
 * Homepage feed caching — edge-friendly payload reduction
 */

import { cacheGetJson, cacheSetJson } from "@/lib/infrastructure/cache";
import { INFRA_CONFIG } from "@/lib/infrastructure/config";
import { CACHE_KEYS } from "@/lib/infrastructure/cache/index";

export type HomepageCachePayload = {
  items: unknown[];
  cachedAt: string;
  version: number;
};

const VERSION = 1;

export async function getCachedHomepageFeed(): Promise<HomepageCachePayload | null> {
  return cacheGetJson<HomepageCachePayload>(CACHE_KEYS.homepageFeed);
}

export async function setCachedHomepageFeed(
  items: unknown[]
): Promise<void> {
  const payload: HomepageCachePayload = {
    items,
    cachedAt: new Date().toISOString(),
    version: VERSION,
  };
  await cacheSetJson(
    CACHE_KEYS.homepageFeed,
    payload,
    INFRA_CONFIG.homepageCacheSeconds
  );
}

export async function getOrBuildHomepageFeed<T>(
  builder: () => Promise<T[]>
): Promise<{ items: T[]; cached: boolean; cachedAt?: string }> {
  const hit = await getCachedHomepageFeed();
  if (hit?.items?.length) {
    return {
      items: hit.items as T[],
      cached: true,
      cachedAt: hit.cachedAt,
    };
  }

  const items = await builder();
  await setCachedHomepageFeed(items);
  return { items, cached: false };
}
