/**
 * Tenant-safe cache key helpers — prevent cross-tenant key collisions.
 */

const UNSAFE_SEGMENT = /[^a-zA-Z0-9:_-]/g;

export function sanitizeCacheKeySegment(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "unknown";
  return trimmed.replace(UNSAFE_SEGMENT, "_").slice(0, 120);
}

/**
 * Build a tenant-scoped cache key. Throws when tenant is missing so callers
 * cannot silently write global keys for tenant data.
 */
export function buildTenantCacheKey(
  namespace: string,
  tenantId: string | null | undefined,
  ...parts: Array<string | number>
): string {
  const tenant = tenantId?.trim();
  if (!tenant) {
    throw new Error("tenant_cache_key_missing_tenant");
  }
  const segs = [
    sanitizeCacheKeySegment(namespace),
    "t",
    sanitizeCacheKeySegment(tenant),
    ...parts.map((p) => sanitizeCacheKeySegment(String(p))),
  ];
  return segs.join(":");
}

/** True when a key already includes an explicit tenant segment. */
export function isTenantScopedCacheKey(key: string): boolean {
  return /:t:[a-zA-Z0-9_-]+:/.test(key) || /:tenant:[a-zA-Z0-9_-]+:/.test(key);
}

/**
 * Classify Redis impact for ops health — connection loss is performance/cache
 * consistency, not content correctness (DB remains source of truth).
 */
export function redisFailureImpact(): {
  correctness: "unaffected";
  performance: "degraded";
  multiInstanceConsistency: "degraded";
} {
  return {
    correctness: "unaffected",
    performance: "degraded",
    multiInstanceConsistency: "degraded",
  };
}
