/**
 * Live aggregation tunables — circuit breaker, cache, ingest-first thresholds
 */

export const AGGREGATION_CONFIG = {
  /** Ingest-first: skip runtime wire when DB pool is healthy */
  dbHealthyThreshold: Number(process.env.DB_HEALTHY_THRESHOLD) || 12,
  /** Minimum DB rows before any wire fallback */
  dbCriticalThreshold: Number(process.env.DB_CRITICAL_THRESHOLD) || 3,

  circuitFailureThreshold: Number(process.env.CIRCUIT_FAILURE_THRESHOLD) || 5,
  circuitCooldownMs: Number(process.env.CIRCUIT_COOLDOWN_MS) || 15 * 60 * 1000,
  circuitMaxProviders: 24,

  wireCacheTtlSec: Number(process.env.WIRE_CACHE_TTL_SEC) || 90,
  wireCacheStaleSec: Number(process.env.WIRE_CACHE_STALE_SEC) || 120,
  /** Maximum reader-request wait for uncached wire providers before static fallback. */
  wireRuntimeDeadlineMs:
    Number(process.env.WIRE_RUNTIME_DEADLINE_MS) || 6_000,

  staleSnapshotMaxAgeMs:
    Number(process.env.STALE_SNAPSHOT_MAX_AGE_MS) || 6 * 60 * 60 * 1000,
  staleSnapshotTtlSec:
    Number(process.env.STALE_SNAPSHOT_TTL_SEC) || 6 * 60 * 60,

  homepageMicroCacheTtlSec:
    Number(process.env.HOMEPAGE_MICRO_CACHE_TTL_SEC) || 60,
  breakingMicroCacheTtlSec:
    Number(process.env.BREAKING_MICRO_CACHE_TTL_SEC) || 45,
  regionalMicroCacheTtlSec:
    Number(process.env.REGIONAL_MICRO_CACHE_TTL_SEC) || 75,
} as const;
