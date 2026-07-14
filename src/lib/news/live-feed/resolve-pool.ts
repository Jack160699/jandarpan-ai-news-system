/**
 * Production resolver — ingest-first DB → wire cache → stale snapshot → static fallback.
 *
 * Priority:
 * 1. Fresh Supabase generated_articles (healthy pool)
 * 2. Wire APIs (micro-cached, circuit-breaker gated) when DB critically low
 * 3. Stale-while-revalidate snapshot
 * 4. Static Hindi fallback
 */

import { AGGREGATION_CONFIG } from "@/lib/news/aggregation/config";
import { getStaticFallbackArticlePool } from "@/lib/news/fallback/wire-articles";
import { getWireArticlesCached } from "@/lib/news/live-feed/wire-cache";
import {
  flushAggregationMetrics,
  recordPoolMeta,
  recordStaleServe,
  resetAggregationMetrics,
} from "@/lib/news/live-feed/observability";
import { rankPoolByFeedQuality } from "@/lib/news/live-feed/quality-score";
import {
  loadStaleSnapshotWithMeta,
  saveFeedSnapshot,
} from "@/lib/news/live-feed/stale-snapshot";
import { errorLiveFeed, logLiveFeed, warnLiveFeed } from "@/lib/news/live-feed/logger";
import { wireArticlesToGeneratedPool } from "@/lib/news/live-feed/wire-to-generated";
import { fetchGeneratedArticlePool, type GeneratedPoolSelect } from "@/lib/newsroom/generated/read";
import { isSupabaseConfigured } from "@/lib/supabase";
import type { GeneratedArticleRow } from "@/lib/types/newsroom";

export type LivePoolSource =
  | "database"
  | "wire_api"
  | "static_fallback"
  | "mixed"
  | "stale_snapshot";

export type LivePoolDiagnostics = {
  dbCount: number;
  wireCount: number;
  finalCount: number;
  source: LivePoolSource;
  supabaseConfigured: boolean;
  rateLimited: boolean;
  errors: string[];
  providersAttempted: string[];
  qualityRanked: boolean;
  ingestFirstSkippedWire: boolean;
  staleAgeMs: number | null;
  cacheHits: number;
  cacheMisses: number;
};

export type ResolvedLivePool = {
  rows: GeneratedArticleRow[];
  diagnostics: LivePoolDiagnostics;
};

function mergePools(
  primary: GeneratedArticleRow[],
  secondary: GeneratedArticleRow[]
): GeneratedArticleRow[] {
  const seen = new Set(primary.map((r) => r.id));
  const merged = [...primary];
  for (const row of secondary) {
    if (seen.has(row.id)) continue;
    seen.add(row.id);
    merged.push(row);
  }
  return merged;
}

function finalizePool(
  rows: GeneratedArticleRow[],
  source: LivePoolSource,
  diagnostics: LivePoolDiagnostics
): ResolvedLivePool {
  const ranked = rankPoolByFeedQuality(rows);
  diagnostics.qualityRanked = true;
  diagnostics.finalCount = ranked.length;
  diagnostics.source = source;

  void saveFeedSnapshot(ranked, source);
  recordPoolMeta({
    source,
    poolSize: ranked.length,
    wireSkippedIngestFirst: diagnostics.ingestFirstSkippedWire,
  });

  return { rows: ranked, diagnostics };
}

function withDeadline<T>(promise: Promise<T>, deadlineMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`wire_runtime_timeout_${deadlineMs}ms`)),
      deadlineMs
    );
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}

/**
 * Resolve articles for homepage + live polling. Never returns an empty array.
 */
export async function resolveLiveArticlePool(
  limit = 120,
  options?: { select?: GeneratedPoolSelect }
): Promise<ResolvedLivePool> {
  resetAggregationMetrics();

  const diagnostics: LivePoolDiagnostics = {
    dbCount: 0,
    wireCount: 0,
    finalCount: 0,
    source: "static_fallback",
    supabaseConfigured: isSupabaseConfigured(),
    rateLimited: false,
    errors: [],
    providersAttempted: [],
    qualityRanked: false,
    ingestFirstSkippedWire: false,
    staleAgeMs: null,
    cacheHits: 0,
    cacheMisses: 0,
  };

  let dbRows: GeneratedArticleRow[] = [];

  if (diagnostics.supabaseConfigured) {
    try {
      dbRows = await fetchGeneratedArticlePool(limit, {
        select: options?.select,
      });
      diagnostics.dbCount = dbRows.length;
      logLiveFeed("db_pool", { count: dbRows.length });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "db_fetch_failed";
      diagnostics.errors.push(msg);
      errorLiveFeed("db_pool_failed", { error: msg });
    }
  } else {
    warnLiveFeed("db_skip", { reason: "supabase_not_configured" });
    diagnostics.errors.push("supabase_not_configured");
  }

  const healthyDb =
    dbRows.length >= AGGREGATION_CONFIG.dbHealthyThreshold;

  if (healthyDb) {
    diagnostics.ingestFirstSkippedWire = true;
    logLiveFeed("ingest_first", {
      dbCount: dbRows.length,
      skippedWire: true,
    });
    const result = finalizePool(
      dbRows.slice(0, limit),
      "database",
      diagnostics
    );
    flushAggregationMetrics();
    return result;
  }

  if (dbRows.length >= AGGREGATION_CONFIG.dbCriticalThreshold) {
    diagnostics.ingestFirstSkippedWire = true;
    warnLiveFeed("db_sparse_ingest_first", {
      dbCount: dbRows.length,
      threshold: AGGREGATION_CONFIG.dbHealthyThreshold,
    });
    const result = finalizePool(dbRows, "database", diagnostics);
    flushAggregationMetrics();
    return result;
  }

  let wireRows: GeneratedArticleRow[] = [];
  try {
    const wire = await withDeadline(
      getWireArticlesCached(Math.min(limit, 80)),
      AGGREGATION_CONFIG.wireRuntimeDeadlineMs
    );
    diagnostics.rateLimited = wire.rateLimited;
    diagnostics.errors.push(...wire.errors);
    diagnostics.providersAttempted = wire.providersAttempted;
    wireRows = wireArticlesToGeneratedPool(wire.articles, limit);
    diagnostics.wireCount = wireRows.length;
  } catch (err) {
    const msg = err instanceof Error ? err.message : "wire_fetch_failed";
    diagnostics.errors.push(msg);
    errorLiveFeed("wire_pool_failed", { error: msg });
  }

  if (wireRows.length > 0) {
    const merged = mergePools(dbRows, wireRows);
    const result = finalizePool(
      merged.slice(0, limit),
      dbRows.length > 0 ? "mixed" : "wire_api",
      diagnostics
    );
    flushAggregationMetrics();
    return result;
  }

  if (dbRows.length > 0) {
    const result = finalizePool(dbRows, "database", diagnostics);
    flushAggregationMetrics();
    return result;
  }

  const stale = await loadStaleSnapshotWithMeta();
  if (stale) {
    diagnostics.source = "stale_snapshot";
    diagnostics.staleAgeMs = stale.ageMs;
    recordStaleServe(stale.ageMs);
    warnLiveFeed("pool_stale_snapshot", {
      ageMs: stale.ageMs,
      poolSize: stale.snapshot.rows.length,
    });
    const result = finalizePool(
      stale.snapshot.rows.slice(0, limit),
      "stale_snapshot",
      diagnostics
    );
    flushAggregationMetrics();
    return result;
  }

  const fallback = getStaticFallbackArticlePool();
  diagnostics.source = "static_fallback";
  warnLiveFeed("pool_static_fallback", {
    reason: diagnostics.errors.join("; ") || "all_layers_failed",
    rateLimited: diagnostics.rateLimited,
  });

  const result = finalizePool(fallback, "static_fallback", diagnostics);
  flushAggregationMetrics();
  return result;
}

/** Call after successful cron ingest to refresh SWR snapshot */
export async function refreshSnapshotFromDatabase(
  limit = 120,
  options?: { select?: GeneratedPoolSelect }
): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const rows = await fetchGeneratedArticlePool(limit, options);
  if (rows.length >= AGGREGATION_CONFIG.dbCriticalThreshold) {
    const ranked = rankPoolByFeedQuality(rows);
    await saveFeedSnapshot(ranked, "database");
    logLiveFeed("ingest_snapshot_refreshed", { count: ranked.length });
  }
}
