/**
 * Homepage Redis invalidation — tenant × language deterministic keys (no SCAN).
 */

import { cacheDeleteMany } from "@/lib/infrastructure/cache";
import {
  collectHomepageRedisInvalidationKeys,
  listTenantSlugsForCacheInvalidation,
} from "@/lib/infrastructure/cache/homepage-keys";

/**
 * Delete all homepage feed + segment Redis/memory entries for every active tenant
 * and each tenant's enabled languages.
 */
export async function invalidateHomepageRedisCaches(): Promise<{
  keysDeleted: number;
  tenantCount: number;
}> {
  const tenantSlugs = await listTenantSlugsForCacheInvalidation();
  const keys = collectHomepageRedisInvalidationKeys(tenantSlugs);
  await cacheDeleteMany(keys);
  return { keysDeleted: keys.length, tenantCount: tenantSlugs.length };
}
