/**
 * Single server-side canonical health service for Admin V3 shell surfaces.
 * Header, Command Centre, notifications, Platform overview/health share this.
 */

import { buildHealthSummary } from "@/lib/admin-v3/health-summary";
import type { CanonicalHealthSnapshot } from "@/lib/admin-v3/canonical-health";
import {
  buildEnvelope,
  metricFreshnessFromAge,
  type MetricFreshness,
} from "@/lib/admin-v3/metric-contract";

export const CANONICAL_HEALTH_CACHE_TTL_MS = 30_000;
export const CANONICAL_HEALTH_STALE_MS = 5 * 60_000;
export const CANONICAL_HEALTH_EXPIRED_MS = 15 * 60_000;

export type CanonicalSourceStatus = {
  source: string;
  ok: boolean;
  ms: number;
  error?: string;
  optional?: boolean;
};

export type CanonicalHealthServiceResult = {
  ok: boolean;
  mode: "summary";
  snapshot: CanonicalHealthSnapshot & {
    generatedAt: string;
    lastSuccessfulAt: string | null;
    freshness: MetricFreshness;
    usedLastKnown: boolean;
    partialSources: string[];
    sourceStatuses: CanonicalSourceStatus[];
  };
  checks: Array<{
    id: string;
    label: string;
    status: string;
    latencyMs: number;
    message?: string;
  }>;
  sources: CanonicalSourceStatus[];
  failedSources: CanonicalSourceStatus[];
  metrics: {
    memoryUsageMb: number;
    uptimeSec: number;
    queues: unknown;
  };
  cron: unknown;
  totalMs: number;
  checkedAt: string;
  stale: boolean;
  fromCache: boolean;
  contract: ReturnType<typeof buildEnvelope> & { source: string };
  timing: { totalMs: number; cacheHit: boolean; buildMs?: number };
};

type CacheSlot = {
  result: CanonicalHealthServiceResult;
  storedAt: number;
};

let cacheSlot: CacheSlot | null = null;
let lastSuccessful: CanonicalHealthServiceResult | null = null;
let inflight: Promise<CanonicalHealthServiceResult> | null = null;

const OPTIONAL_SOURCES = new Set(["openai", "redis", "redis_cache"]);

function markOptionalSources(
  sources: Array<{ source: string; ok: boolean; ms: number; error?: string }>
): CanonicalSourceStatus[] {
  return sources.map((s) => {
    const err = (s.error ?? "").toLowerCase();
    const optional =
      OPTIONAL_SOURCES.has(s.source) ||
      err.includes("not_configured") ||
      err.includes("redis_not_configured") ||
      err.includes("no ai providers") ||
      err.includes("local enrich");
    return { ...s, optional };
  });
}

function withFreshness(
  base: Awaited<ReturnType<typeof buildHealthSummary>>,
  opts: {
    usedLastKnown: boolean;
    fromCache: boolean;
    buildMs?: number;
    lastSuccessfulAt: string | null;
  }
): CanonicalHealthServiceResult {
  const generatedAt = base.checkedAt;
  const sourceStatuses = markOptionalSources(base.sources);
  const partialSources = sourceStatuses
    .filter((s) => !s.ok && !s.optional)
    .map((s) => s.source);

  let freshness = metricFreshnessFromAge(generatedAt, {
    freshMs: 60_000,
    staleMs: CANONICAL_HEALTH_STALE_MS,
  });
  if (opts.usedLastKnown) {
    freshness =
      metricFreshnessFromAge(opts.lastSuccessfulAt, {
        freshMs: 60_000,
        staleMs: CANONICAL_HEALTH_STALE_MS,
      }) === "unavailable"
        ? "unavailable"
        : "stale";
  }

  const ageMs = opts.lastSuccessfulAt
    ? Date.now() - Date.parse(opts.lastSuccessfulAt)
    : Number.POSITIVE_INFINITY;

  let snapshotState = base.snapshot.state;
  let snapshotLabel = base.snapshot.label;

  // Expired last-known must not keep advertising Healthy forever.
  if (opts.usedLastKnown && ageMs > CANONICAL_HEALTH_EXPIRED_MS) {
    snapshotState = "unknown";
    snapshotLabel = "Production · Stale (refresh failed)";
    freshness = "unavailable";
  } else if (
    opts.usedLastKnown &&
    ageMs > CANONICAL_HEALTH_STALE_MS &&
    snapshotState === "healthy"
  ) {
    snapshotState = "warning";
    snapshotLabel = "Production · Stale healthy (unverified)";
  }

  const snapshot = {
    ...base.snapshot,
    state: snapshotState,
    label: snapshotLabel,
    generatedAt,
    lastSuccessfulAt: opts.lastSuccessfulAt,
    freshness,
    usedLastKnown: opts.usedLastKnown,
    partialSources,
    sourceStatuses,
  };

  return {
    ok: base.ok,
    mode: "summary",
    snapshot,
    checks: base.checks,
    sources: sourceStatuses,
    failedSources: sourceStatuses.filter((s) => !s.ok),
    metrics: base.metrics,
    cron: base.cron,
    totalMs: base.totalMs,
    checkedAt: generatedAt,
    stale: base.stale || opts.usedLastKnown || freshness === "stale",
    fromCache: opts.fromCache,
    contract: {
      ...buildEnvelope({
        ok: true,
        generatedAt,
        stale: base.stale || opts.usedLastKnown,
      }),
      source: "canonical_health_service",
    },
    timing: {
      totalMs: base.totalMs,
      cacheHit: opts.fromCache,
      buildMs: opts.buildMs,
    },
  };
}

async function buildFresh(): Promise<CanonicalHealthServiceResult> {
  const started = Date.now();
  try {
    const summary = await buildHealthSummary();
    const result = withFreshness(summary, {
      usedLastKnown: false,
      fromCache: false,
      buildMs: Date.now() - started,
      lastSuccessfulAt: summary.checkedAt,
    });
    lastSuccessful = result;
    cacheSlot = { result, storedAt: Date.now() };
    return result;
  } catch (err) {
    if (lastSuccessful) {
      const reused = {
        ...lastSuccessful,
        ok: false,
        stale: true,
        fromCache: false,
        totalMs: Date.now() - started,
        timing: {
          totalMs: Date.now() - started,
          cacheHit: false,
          buildMs: Date.now() - started,
        },
        snapshot: {
          ...lastSuccessful.snapshot,
          usedLastKnown: true,
          freshness: metricFreshnessFromAge(
            lastSuccessful.snapshot.lastSuccessfulAt,
            { freshMs: 60_000, staleMs: CANONICAL_HEALTH_STALE_MS }
          ) === "unavailable"
            ? ("unavailable" as const)
            : ("stale" as const),
        },
        contract: {
          ...lastSuccessful.contract,
          freshness: "stale" as const,
          availability: "partial" as const,
        },
      };
      const ageMs = lastSuccessful.snapshot.lastSuccessfulAt
        ? Date.now() - Date.parse(lastSuccessful.snapshot.lastSuccessfulAt)
        : Number.POSITIVE_INFINITY;
      if (ageMs > CANONICAL_HEALTH_EXPIRED_MS) {
        reused.snapshot.state = "unknown";
        reused.snapshot.label = "Production · Stale (refresh failed)";
        reused.snapshot.freshness = "unavailable";
      } else if (
        ageMs > CANONICAL_HEALTH_STALE_MS &&
        reused.snapshot.state === "healthy"
      ) {
        reused.snapshot.state = "warning";
        reused.snapshot.label = "Production · Stale healthy (unverified)";
      }
      return reused;
    }
    const checkedAt = new Date().toISOString();
    return {
      ok: false,
      mode: "summary",
      snapshot: {
        state: "unknown",
        label: "Production · Unknown",
        reasons: [
          {
            id: "canonical-build-failed",
            severity: "unknown",
            title: "Health summary unavailable",
            detail: err instanceof Error ? err.message : "build_failed",
            href: "/admin/health",
          },
        ],
        checkedAt,
        criticalCount: 0,
        warningCount: 0,
        topIncidents: [],
        generatedAt: checkedAt,
        lastSuccessfulAt: null,
        freshness: "unavailable",
        usedLastKnown: false,
        partialSources: ["summary"],
        sourceStatuses: [],
      },
      checks: [],
      sources: [],
      failedSources: [],
      metrics: { memoryUsageMb: 0, uptimeSec: 0, queues: null },
      cron: { jobs: [], staleJobs: [] },
      totalMs: Date.now() - started,
      checkedAt,
      stale: true,
      fromCache: false,
      contract: {
        ...buildEnvelope({ ok: false, generatedAt: checkedAt }),
        source: "canonical_health_service",
      },
      timing: { totalMs: Date.now() - started, cacheHit: false },
    };
  }
}

export type GetCanonicalHealthOptions = {
  force?: boolean;
};

export async function getCanonicalHealth(
  opts: GetCanonicalHealthOptions = {}
): Promise<CanonicalHealthServiceResult> {
  const now = Date.now();
  if (
    !opts.force &&
    cacheSlot &&
    now - cacheSlot.storedAt < CANONICAL_HEALTH_CACHE_TTL_MS
  ) {
    return {
      ...cacheSlot.result,
      fromCache: true,
      timing: {
        ...cacheSlot.result.timing,
        cacheHit: true,
        totalMs: 0,
      },
    };
  }

  if (inflight) return inflight;

  inflight = buildFresh().finally(() => {
    inflight = null;
  });
  return inflight;
}

/** Test helper — clears module cache. */
export function resetCanonicalHealthCacheForTests(): void {
  cacheSlot = null;
  lastSuccessful = null;
  inflight = null;
}

export function peekCanonicalHealthCacheForTests(): {
  hasCache: boolean;
  hasLastSuccessful: boolean;
} {
  return {
    hasCache: Boolean(cacheSlot),
    hasLastSuccessful: Boolean(lastSuccessful),
  };
}
