/**
 * Batched RSS ingestion — parallel feeds per batch, deadline-aware
 */

import { dedupeArticles } from "@/lib/news/normalize";
import { fetchRssSourceBatch } from "@/lib/news/providers/rss";
import {
  isSourceSkipped,
  loadSourceHealth,
} from "@/lib/news/rss-health";
import {
  maxPollDelayMs,
  RSS_SOURCES,
  sourceEffectivePriority,
  type RSSSource,
} from "@/lib/news/providers/rss-sources";
import type { NormalizedArticle, RssSourceAnalytics } from "@/lib/news/types";
import { shouldPollSource } from "@/lib/news/ingestion/source-health";
import {
  buildSourceKey,
  loadAllIngestionSourceStates,
} from "@/lib/news/ingestion/source-state";


export const RSS_FEED_BATCH_SIZE = 4;

export type RssBatchPayload = {
  batchIndex: number;
  articles: NormalizedArticle[];
  sourceAnalytics: RssSourceAnalytics[];
  errors: string[];
  recovered: number;
  healthySources: string[];
  failedSources: string[];
  durationMs: number;
};

export type RssBatchedSummary = {
  totalArticles: number;
  batchesRun: number;
  batchesSkipped: number;
  sourceAnalytics: RssSourceAnalytics[];
  healthySources: string[];
  failedSources: string[];
  articlesRecoveredByFallback: number;
  errors: string[];
  durationMs: number;
  /** Feeds not polled this run because adaptive backoff says they are not due. */
  sourcesSkippedBackoff?: number;
};

/** Deterministic feed partition: shard i of n takes every feed whose rank (by priority) is congruent to i mod n. */
export function selectRssShard<T>(sorted: readonly T[], shard?: { index: number; count: number }): T[] {
  if (!shard || shard.count <= 1) return [...sorted];
  const index = ((Math.floor(shard.index) % shard.count) + shard.count) % shard.count;
  return sorted.filter((_, i) => i % shard.count === index);
}

export async function runRssBatched(options: {
  shouldStop: () => boolean;
  onBatchComplete: (batch: RssBatchPayload) => Promise<void>;
  batchSize?: number;
  /** Edge workers poll a slice of the feeds per invocation so each call stays small and bounded. */
  shard?: { index: number; count: number };
}): Promise<RssBatchedSummary> {
  const startedAt = Date.now();
  const batchSize = options.batchSize ?? RSS_FEED_BATCH_SIZE;

  const [health, sourceStates] = await Promise.all([
    loadSourceHealth(),
    loadAllIngestionSourceStates().catch(() => new Map()),
  ]);
  // Rank by priority over the STABLE enabled set, then shard, THEN apply adaptive backoff. Sharding the already
  // backoff-filtered list made a source's shard depend on which other feeds happened to be due, so it could slip
  // between shard slots and be polled twice or skipped in a cycle. Primary-district publishers rank first, so they
  // land on distinct shards (rank mod n) and are polled every cycle.
  const enabledSources = [...RSS_SOURCES]
    .filter((s) => !isSourceSkipped(s, health))
    .sort((a, b) => sourceEffectivePriority(b) - sourceEffectivePriority(a) || a.id.localeCompare(b.id));
  const inShard = selectRssShard(enabledSources, options.shard);
  // Adaptive polling: a feed that keeps returning only duplicates is polled less often (see source-health.ts),
  // but verified local publishers have a bounded maximum interval (maxPollDelayMs) and are never suppressed past it.
  const shardSources = inShard.filter((s) =>
    shouldPollSource(sourceStates.get(buildSourceKey("rss", s.id)), {
      highValue: maxPollDelayMs(s) !== null && s.tier === "publisher",
      maxDelayMs: maxPollDelayMs(s),
    })
  );
  const sourcesSkippedBackoff = inShard.length - shardSources.length;

  const allAnalytics: RssSourceAnalytics[] = [];
  const allErrors: string[] = [];
  const healthySet = new Set<string>();
  const failedSet = new Set<string>();
  let totalArticles = 0;
  let batchesRun = 0;
  let batchesSkipped = 0;
  let articlesRecoveredByFallback = 0;

  for (let i = 0; i < shardSources.length; i += batchSize) {
    if (options.shouldStop()) {
      batchesSkipped += Math.ceil((shardSources.length - i) / batchSize);
      console.warn("[rss-batch] Stopping — deadline reached");
      break;
    }

    const slice = shardSources.slice(i, i + batchSize);
    const batchStarted = Date.now();

    const results = await Promise.allSettled(
      slice.map((source) => fetchRssSourceBatch(source, health))
    );

    const fulfilled = results
      .map((r, idx) =>
        r.status === "fulfilled"
          ? r.value
          : {
              source: slice[idx].id,
              fetched: 0,
              valid: 0,
              rejected: 0,
              duplicates: 0,
              articles: [] as NormalizedArticle[],
              recovered: 0,
              error:
                r.reason instanceof Error
                  ? r.reason.message
                  : "source batch failed",
            }
      )
      .flat();

    const merged = fulfilled.flatMap((r) => {
      const src = RSS_SOURCES.find((s) => s.id === r.source);
      const priority = src ? sourceEffectivePriority(src) : 0;
      return r.articles.map((a) => ({ ...a, _priority: priority }));
    });

    const { unique } = dedupeArticles(
      merged as (NormalizedArticle & { _priority?: number })[],
      { fuzzy: true }
    );

    const sourceAnalytics: RssSourceAnalytics[] = fulfilled.map(
      ({ source, fetched, valid, rejected, duplicates, skipped, error }) => ({
        source,
        fetched,
        valid,
        rejected,
        duplicates,
        skipped,
        error,
      })
    );

    const batchErrors = fulfilled
      .filter((r) => r.error)
      .map((r) => `${r.source}: ${r.error}`);

    const batchHealthy = fulfilled.filter((r) => r.valid > 0).map((r) => r.source);
    const batchFailed = fulfilled
      .filter((r) => r.error || (r.fetched > 0 && r.valid === 0))
      .map((r) => r.source);

    batchHealthy.forEach((s) => healthySet.add(s));
    batchFailed.forEach((s) => failedSet.add(s));
    allAnalytics.push(...sourceAnalytics);
    allErrors.push(...batchErrors);

    const recovered = fulfilled.reduce((n, r) => n + r.recovered, 0);
    articlesRecoveredByFallback += recovered;
    totalArticles += unique.length;
    batchesRun++;

    const payload: RssBatchPayload = {
      batchIndex: batchesRun,
      articles: unique,
      sourceAnalytics,
      errors: batchErrors,
      recovered,
      healthySources: batchHealthy,
      failedSources: batchFailed,
      durationMs: Date.now() - batchStarted,
    };

    await options.onBatchComplete(payload);
  }

  return {
    totalArticles,
    batchesRun,
    batchesSkipped,
    sourceAnalytics: allAnalytics,
    healthySources: [...healthySet],
    failedSources: [...failedSet],
    articlesRecoveredByFallback,
    errors: allErrors,
    durationMs: Date.now() - startedAt,
    sourcesSkippedBackoff,
  };
}
