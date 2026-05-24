/**
 * Production observability — latency, quota, cache, retries (debug-safe).
 */

import { logLiveFeed, warnLiveFeed } from "@/lib/news/live-feed/logger";

export type ProviderFetchMetric = {
  provider: string;
  latencyMs: number;
  articles: number;
  success: boolean;
  rateLimited?: boolean;
  quotaRemaining?: number | null;
  retries?: number;
  timeout?: boolean;
  skipped?: boolean;
  circuitOpen?: boolean;
};

export type AggregationMetrics = {
  cacheHits: number;
  cacheMisses: number;
  staleServed: boolean;
  staleAgeMs: number | null;
  poolSource: string;
  poolSize: number;
  wireSkippedIngestFirst: boolean;
  providerMetrics: ProviderFetchMetric[];
};

const globalMetrics = globalThis as unknown as {
  __liveFeedMetrics?: AggregationMetrics;
};

function metrics(): AggregationMetrics {
  if (!globalMetrics.__liveFeedMetrics) {
    globalMetrics.__liveFeedMetrics = {
      cacheHits: 0,
      cacheMisses: 0,
      staleServed: false,
      staleAgeMs: null,
      poolSource: "unknown",
      poolSize: 0,
      wireSkippedIngestFirst: false,
      providerMetrics: [],
    };
  }
  return globalMetrics.__liveFeedMetrics;
}

export function resetAggregationMetrics(): AggregationMetrics {
  globalMetrics.__liveFeedMetrics = {
    cacheHits: 0,
    cacheMisses: 0,
    staleServed: false,
    staleAgeMs: null,
    poolSource: "unknown",
    poolSize: 0,
    wireSkippedIngestFirst: false,
    providerMetrics: [],
  };
  return globalMetrics.__liveFeedMetrics;
}

export function getAggregationMetrics(): AggregationMetrics {
  return { ...metrics(), providerMetrics: [...metrics().providerMetrics] };
}

export function recordCacheHit(segment: string): void {
  metrics().cacheHits += 1;
  logLiveFeed("cache_hit", { segment });
}

export function recordCacheMiss(segment: string): void {
  metrics().cacheMisses += 1;
  logLiveFeed("cache_miss", { segment });
}

export function recordStaleServe(ageMs: number): void {
  const m = metrics();
  m.staleServed = true;
  m.staleAgeMs = ageMs;
  warnLiveFeed("stale_snapshot_served", { staleAgeMs: ageMs });
}

export function recordPoolMeta(input: {
  source: string;
  poolSize: number;
  wireSkippedIngestFirst?: boolean;
}): void {
  const m = metrics();
  m.poolSource = input.source;
  m.poolSize = input.poolSize;
  m.wireSkippedIngestFirst = input.wireSkippedIngestFirst ?? false;
}

export function recordProviderMetric(metric: ProviderFetchMetric): void {
  metrics().providerMetrics.push(metric);
  const parts = [
    `provider=${metric.provider}`,
    `latency=${metric.latencyMs}ms`,
    `articles=${metric.articles}`,
    `success=${metric.success}`,
  ];
  if (metric.quotaRemaining != null) {
    parts.push(`quotaRemaining=${metric.quotaRemaining}`);
  }
  if (metric.rateLimited) parts.push("rateLimited=true");
  if (metric.circuitOpen) parts.push("circuitOpen=true");
  if (metric.retries) parts.push(`retries=${metric.retries}`);
  if (metric.timeout) parts.push("timeout=true");

  logLiveFeed("provider_fetch", {
    line: parts.join(" "),
    ...metric,
  });
}

export async function withTiming<T>(
  label: string,
  fn: () => Promise<T>
): Promise<{ result: T; durationMs: number }> {
  const started = Date.now();
  try {
    const result = await fn();
    const durationMs = Date.now() - started;
    logLiveFeed("timing", { label, durationMs });
    return { result, durationMs };
  } catch (err) {
    const durationMs = Date.now() - started;
    warnLiveFeed("timing_error", {
      label,
      durationMs,
      error: err instanceof Error ? err.message : "unknown",
    });
    throw err;
  }
}

export function flushAggregationMetrics(): void {
  const m = getAggregationMetrics();
  logLiveFeed("aggregation_summary", m);
  resetAggregationMetrics();
}
