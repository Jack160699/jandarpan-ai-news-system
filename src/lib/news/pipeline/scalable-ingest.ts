/**
 * Scalable ingestion orchestrator — parallel providers, incremental upserts, async AI
 */

import { logIngestionAnalytics } from "@/lib/infrastructure/analytics/ingestion";
import { evaluateIngestionAlert } from "@/lib/observability/alerts";
import { createAdminServerClient } from "@/lib/supabase";
import { countPendingAiQueue } from "@/lib/news/ai/queue";
import { logNewsroom } from "@/lib/newsroom";
import type { ImageEnrichmentAnalytics } from "@/lib/news/images/enrich";
import {
  emptyEarlyDedupMetrics,
  mergeEarlyDedupMetrics,
  type EarlyDedupMetrics,
} from "@/lib/news/ingestion/early-dedup";
import {
  ingestProviderArticles,
  mergeValidationStats,
} from "@/lib/news/pipeline/ingest-provider-batch";
import type { ArticleValidationStats } from "@/lib/news/sanitize-article";
import { runParallelApiProviders } from "@/lib/news/providers/run-provider";
import { runRssBatched } from "@/lib/news/providers/rss-batch";
import { bootstrapPlatformSources } from "@/lib/platform-admin/bootstrap";
import type { ExecutionDeadline } from "@/lib/serverless/deadline";

export type ScalableIngestResult = {
  ok: boolean;
  inserted: number;
  signalsInserted: number;
  skippedDuplicates: number;
  failedValidation: number;
  totalFetched: number;
  queuedForAI: number;
  durationMs: number;
  timedOutSafely: boolean;
  completedProviders: string[];
  skippedProviders: string[];
  categoryStats: Record<string, number>;
  providerStats: Record<string, number>;
  errors: string[];
  failures: Array<{ title: string; reason: string; provider: string }>;
  logId: string | null;
  rssSourceAnalytics: Array<{
    source: string;
    fetched: number;
    valid: number;
    rejected: number;
    duplicates: number;
    skipped?: boolean;
    error?: string;
    earlyDuplicates?: number;
    incrementalFiltered?: number;
  }>;
  healthySources: string[];
  failedSources: string[];
  articlesRecoveredByFallback: number;
  imageAnalytics: ImageEnrichmentAnalytics | null;
  validationStats: ArticleValidationStats;
  normalized: number;
  earlyDedup: EarlyDedupMetrics;
  /** Rows attempted for news_signals upsert across providers */
  attemptedInserts: number;
  failedBatches: number;
  persistenceErrors: string[];
  allBatchesFailed: boolean;
  partialPersistence: boolean;
  /** True when persistence hard-failed (all batches or zero inserts after DB errors) */
  persistenceFailed: boolean;
};

function mergePersistenceFromProvider(
  acc: {
    attemptedInserts: number;
    failedBatches: number;
    persistenceErrors: string[];
    anyBatchSucceeded: boolean;
    anyBatchFailed: boolean;
  },
  ingested: {
    attemptedInserts: number;
    failedBatches: number;
    persistenceErrors: string[];
    allBatchesFailed: boolean;
    partialPersistence: boolean;
    signalsInserted: number;
  }
) {
  acc.attemptedInserts += ingested.attemptedInserts;
  acc.failedBatches += ingested.failedBatches;
  for (const err of ingested.persistenceErrors) {
    if (acc.persistenceErrors.length < 20) {
      acc.persistenceErrors.push(err);
    }
  }
  if (ingested.failedBatches > 0) acc.anyBatchFailed = true;
  if (
    ingested.attemptedInserts > 0 &&
    (!ingested.allBatchesFailed || ingested.signalsInserted > 0 || ingested.partialPersistence)
  ) {
    // At least one upsert batch returned without error (including ignoreDuplicates).
    if (!ingested.allBatchesFailed) acc.anyBatchSucceeded = true;
  }
  if (ingested.partialPersistence) acc.anyBatchSucceeded = true;
}

export async function runScalableIngestion(
  deadline: ExecutionDeadline
): Promise<ScalableIngestResult> {
  await bootstrapPlatformSources().catch(() => 0);

  const startedAt = Date.now();
  const completedProviders: string[] = [];
  const skippedProviders: string[] = [];
  const errors: string[] = [];
  const failures: ScalableIngestResult["failures"] = [];
  const categoryStats: Record<string, number> = {};
  const providerStats: Record<string, number> = {};
  let inserted = 0;
  let signalsInserted = 0;
  let skippedDuplicates = 0;
  let failedValidation = 0;
  let totalFetched = 0;
  let queuedForAI = 0;
  let imageAnalytics: ImageEnrichmentAnalytics | null = null;
  let earlyDedup = emptyEarlyDedupMetrics();
  const insertedSignalIds: string[] = [];
  const validationStats: ArticleValidationStats = {
    total: 0,
    sanitized: 0,
    softFixed: 0,
    rejected: 0,
    reasons: {},
  };
  const persistenceAcc = {
    attemptedInserts: 0,
    failedBatches: 0,
    persistenceErrors: [] as string[],
    anyBatchSucceeded: false,
    anyBatchFailed: false,
  };

  const apiResults = await runParallelApiProviders();

  for (const run of apiResults) {
    if (deadline.shouldStop()) {
      skippedProviders.push(run.provider);
      continue;
    }

    totalFetched += run.articles.length;
    if (run.errors.length) errors.push(...run.errors.map((e) => `${run.provider}: ${e}`));

    if (!run.articles.length) {
      if (run.errors.length) skippedProviders.push(run.provider);
      // Still count gnews skip-after-quota as completed-but-empty when intentional.
      if (run.errors.some((e) => /gnews_skipped|quota/i.test(e))) {
        skippedProviders.push(run.provider);
      }
      continue;
    }

    const ingested = await ingestProviderArticles(run.articles, run.provider, {
      maxImagePageFetches: run.provider === "gnews" ? 10 : 8,
    });

    inserted += ingested.inserted;
    signalsInserted += ingested.signalsInserted;
    insertedSignalIds.push(...ingested.signalIds);
    skippedDuplicates += ingested.skippedDuplicates;
    failedValidation += ingested.failedValidation;
    queuedForAI += ingested.queuedForAI;
    failures.push(...ingested.failures);
    imageAnalytics = ingested.imageAnalytics ?? imageAnalytics;
    earlyDedup = mergeEarlyDedupMetrics(earlyDedup, ingested.earlyDedup);
    mergeValidationStats(validationStats, ingested.validationStats);
    Object.assign(categoryStats, ingested.categoryStats);
    providerStats[run.provider] =
      (providerStats[run.provider] ?? 0) + ingested.signalsInserted;
    mergePersistenceFromProvider(persistenceAcc, ingested);

    if (ingested.persistenceFailed || ingested.allBatchesFailed) {
      errors.push(
        `${run.provider}: persistence_failed (${ingested.failedBatches} batches)`
      );
    }

    if (
      ingested.signalsInserted > 0 ||
      ingested.totalFetched > 0 ||
      ingested.earlyDedup.passed >= 0
    ) {
      completedProviders.push(run.provider);
    }
  }

  let rssSummary: Awaited<ReturnType<typeof runRssBatched>> = {
    totalArticles: 0,
    batchesRun: 0,
    batchesSkipped: 0,
    sourceAnalytics: [],
    healthySources: [],
    failedSources: [],
    articlesRecoveredByFallback: 0,
    errors: [],
    durationMs: 0,
  };

  if (!deadline.shouldStop()) {
    rssSummary = await runRssBatched({
      shouldStop: () => deadline.shouldStop(),
      onBatchComplete: async (batch) => {
        if (!batch.articles.length) return;

        totalFetched += batch.articles.length;
        const ingested = await ingestProviderArticles(batch.articles, "rss", {
          maxImagePageFetches: 6,
        });

        inserted += ingested.inserted;
        signalsInserted += ingested.signalsInserted;
        insertedSignalIds.push(...ingested.signalIds);
        skippedDuplicates += ingested.skippedDuplicates;
        failedValidation += ingested.failedValidation;
        queuedForAI += ingested.queuedForAI;
        failures.push(...ingested.failures);
        imageAnalytics = ingested.imageAnalytics ?? imageAnalytics;
        earlyDedup = mergeEarlyDedupMetrics(earlyDedup, ingested.earlyDedup);
        mergeValidationStats(validationStats, ingested.validationStats);
        Object.assign(categoryStats, ingested.categoryStats);
        providerStats.rss = (providerStats.rss ?? 0) + ingested.signalsInserted;
        mergePersistenceFromProvider(persistenceAcc, ingested);

        if (ingested.persistenceFailed || ingested.allBatchesFailed) {
          errors.push(
            `rss: persistence_failed (${ingested.failedBatches} batches)`
          );
        }
      },
    });

    if (rssSummary.batchesRun > 0) {
      completedProviders.push("rss");
    } else {
      skippedProviders.push("rss");
    }

    if (rssSummary.batchesSkipped > 0) {
      deadline.markTimedOut();
    }

    errors.push(...rssSummary.errors.map((e) => `rss: ${e}`));
  } else {
    skippedProviders.push("rss");
    deadline.markTimedOut();
  }

  const durationMs = Date.now() - startedAt;
  const pendingAi = await countPendingAiQueue().catch(() => queuedForAI);

  const allBatchesFailed =
    persistenceAcc.attemptedInserts > 0 &&
    persistenceAcc.anyBatchFailed &&
    !persistenceAcc.anyBatchSucceeded;
  const partialPersistence =
    persistenceAcc.attemptedInserts > 0 &&
    persistenceAcc.anyBatchFailed &&
    persistenceAcc.anyBatchSucceeded;
  const persistenceFailed =
    allBatchesFailed ||
    (persistenceAcc.failedBatches > 0 &&
      signalsInserted === 0 &&
      persistenceAcc.attemptedInserts > 0);

  // Clustering runs via event_cluster job on ingest.completed — no inline duplicate.

  const supabase = createAdminServerClient();
  const status = persistenceFailed
    ? "persistence_failed"
    : signalsInserted > 0 || inserted > 0
      ? deadline.timedOutSafely
        ? "partial_timeout"
        : "success"
      : totalFetched > 0
        ? "partial"
        : "empty";

  const earlyDupTotal =
    earlyDedup.earlyDuplicateKnownSignal +
    earlyDedup.earlyDuplicateBatch +
    earlyDedup.earlyDuplicateCanonicalUrl +
    earlyDedup.earlyDuplicateProviderId;

  const { data: logRow } = await supabase
    .from("ingestion_logs")
    .insert({
      status,
      total_fetched: totalFetched,
      total_valid: totalFetched - failedValidation,
      inserted: signalsInserted,
      skipped_duplicates: skippedDuplicates,
      failed_validation: failedValidation,
      category_stats: categoryStats,
      provider_stats: providerStats,
      provider_errors: errors.slice(0, 100),
      duration_ms: durationMs,
      metadata: {
        completed_providers: completedProviders,
        skipped_providers: skippedProviders,
        timed_out_safely: deadline.timedOutSafely,
        queued_for_ai: pendingAi,
        rss_source_analytics: rssSummary.sourceAnalytics,
        rss_healthy_sources: rssSummary.healthySources,
        rss_failed_sources: rssSummary.failedSources,
        articles_recovered_by_fallback: rssSummary.articlesRecoveredByFallback,
        image_analytics: imageAnalytics,
        validation_stats: validationStats,
        signals_inserted: signalsInserted,
        legacy_inserted: inserted,
        signal_ids_sample: insertedSignalIds.slice(0, 20),
        newsroom_layers: ["news_signals", "news_events"],
        scalable: true,
        early_dedup: earlyDedup,
        early_duplicates_total: earlyDupTotal,
        image_enrichment_attempted: imageAnalytics?.total ?? 0,
        metrics_contract_version: 1,
        attempted_inserts: persistenceAcc.attemptedInserts,
        failed_batches: persistenceAcc.failedBatches,
        persistence_failed: persistenceFailed,
        all_batches_failed: allBatchesFailed,
        partial_persistence: partialPersistence,
        persistence_errors: persistenceAcc.persistenceErrors.slice(0, 10),
      },
    })
    .select("id")
    .single();

  const normalized = validationStats.sanitized;

  logIngestionAnalytics({
    event: "ingest_batch",
    durationMs,
    inserted,
    fetched: totalFetched,
    metadata: {
      completedProviders,
      skippedProviders,
      timedOutSafely: deadline.timedOutSafely,
      persistenceFailed,
      allBatchesFailed,
      attemptedInserts: persistenceAcc.attemptedInserts,
    },
  });

  void evaluateIngestionAlert({
    status,
    inserted,
    totalFetched,
    errors: errors.slice(0, 10),
  });

  // Do not treat failed persistence as a successful ingest for downstream side effects.
  if (!persistenceFailed && (inserted > 0 || signalsInserted > 0)) {
    const { refreshSnapshotFromDatabase } = await import(
      "@/lib/news/live-feed/resolve-pool"
    );
    await refreshSnapshotFromDatabase(120).catch((err) => {
      console.warn("[ingest] snapshot refresh failed:", err);
    });
  }

  if (
    !persistenceFailed &&
    signalsInserted > 0 &&
    process.env.INTELLIGENCE_WORKERS_ENABLED !== "false"
  ) {
    const { publishIngestCompleted, publishSignalsCreated } = await import(
      "@/lib/infrastructure/events/event-bus"
    );
    void publishIngestCompleted({
      signalsInserted,
      logId: logRow?.id ?? null,
    }).catch(() => undefined);
    void publishSignalsCreated({
      signalIds: insertedSignalIds,
      logId: logRow?.id ?? null,
    }).catch(() => undefined);
  }

  // editorial_generate is enqueued by event-bus on ingest.completed — no direct duplicate here.

  logNewsroom("pipeline", "INGESTION_FINAL_REPORT", {
    fetched: totalFetched,
    normalized,
    sanitized: validationStats.sanitized,
    softFixed: validationStats.softFixed,
    signalsInserted,
    legacyInserted: inserted,
    rejected: validationStats.rejected,
    failedValidation,
    queuedForAI: pendingAi,
    durationMs,
    completedProviders,
    skippedProviders,
    timedOutSafely: deadline.timedOutSafely,
    validationReasons: validationStats.reasons,
    earlyDedup,
    attemptedInserts: persistenceAcc.attemptedInserts,
    failedBatches: persistenceAcc.failedBatches,
    persistenceFailed,
    allBatchesFailed,
    partialPersistence,
  });

  const ok =
    !persistenceFailed &&
    (inserted > 0 || signalsInserted > 0 || totalFetched > 0);

  if (allBatchesFailed && persistenceAcc.attemptedInserts > 0) {
    const detail =
      persistenceAcc.persistenceErrors.slice(0, 3).join("; ") ||
      "all news_signals upsert batches failed";
    errors.push(`persistence_failed: ${detail}`);
  }

  return {
    ok,
    inserted,
    signalsInserted,
    skippedDuplicates,
    failedValidation,
    totalFetched,
    queuedForAI: pendingAi,
    durationMs,
    timedOutSafely: deadline.timedOutSafely,
    completedProviders,
    skippedProviders,
    categoryStats,
    providerStats,
    errors,
    failures: failures.slice(0, 50),
    logId: logRow?.id ?? null,
    rssSourceAnalytics: rssSummary.sourceAnalytics,
    healthySources: rssSummary.healthySources,
    failedSources: rssSummary.failedSources,
    articlesRecoveredByFallback: rssSummary.articlesRecoveredByFallback,
    imageAnalytics,
    validationStats,
    normalized,
    earlyDedup,
    attemptedInserts: persistenceAcc.attemptedInserts,
    failedBatches: persistenceAcc.failedBatches,
    persistenceErrors: persistenceAcc.persistenceErrors,
    allBatchesFailed,
    partialPersistence,
    persistenceFailed,
  };
}

/** @deprecated AI enrichment runs via ai_enrich worker — do not fire-and-forget /api/process-ai */
export function triggerAiProcessing(_requestUrl: string): void {
  /* no-op: duplicate of ai_enrich worker */
}
