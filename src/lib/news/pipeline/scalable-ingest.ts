/**
 * Scalable ingestion orchestrator — parallel providers, incremental upserts, async AI
 */

import { createAdminServerClient } from "@/lib/supabase";
import { countPendingAiQueue } from "@/lib/news/ai/queue";
import { clusterRecentSignals, logNewsroom } from "@/lib/newsroom";
import type { ImageEnrichmentAnalytics } from "@/lib/news/images/enrich";
import {
  ingestProviderArticles,
  mergeValidationStats,
} from "@/lib/news/pipeline/ingest-provider-batch";
import type { ArticleValidationStats } from "@/lib/news/sanitize-article";
import { runParallelApiProviders } from "@/lib/news/providers/run-provider";
import { runRssBatched } from "@/lib/news/providers/rss-batch";
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
  }>;
  healthySources: string[];
  failedSources: string[];
  articlesRecoveredByFallback: number;
  imageAnalytics: ImageEnrichmentAnalytics | null;
  validationStats: ArticleValidationStats;
  normalized: number;
};

export async function runScalableIngestion(
  deadline: ExecutionDeadline
): Promise<ScalableIngestResult> {
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
  const validationStats: ArticleValidationStats = {
    total: 0,
    sanitized: 0,
    softFixed: 0,
    rejected: 0,
    reasons: {},
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
      continue;
    }

    const ingested = await ingestProviderArticles(run.articles, run.provider, {
      maxImagePageFetches: run.provider === "gnews" ? 10 : 8,
    });

    inserted += ingested.inserted;
    signalsInserted += ingested.signalsInserted;
    skippedDuplicates += ingested.skippedDuplicates;
    failedValidation += ingested.failedValidation;
    queuedForAI += ingested.queuedForAI;
    failures.push(...ingested.failures);
    imageAnalytics = ingested.imageAnalytics ?? imageAnalytics;
    mergeValidationStats(validationStats, ingested.validationStats);
    Object.assign(categoryStats, ingested.categoryStats);
    providerStats[run.provider] =
      (providerStats[run.provider] ?? 0) + ingested.inserted;
    if (ingested.inserted > 0 || ingested.totalFetched > 0) {
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
        skippedDuplicates += ingested.skippedDuplicates;
        failedValidation += ingested.failedValidation;
        queuedForAI += ingested.queuedForAI;
        failures.push(...ingested.failures);
        imageAnalytics = ingested.imageAnalytics ?? imageAnalytics;
        mergeValidationStats(validationStats, ingested.validationStats);
        Object.assign(categoryStats, ingested.categoryStats);
        providerStats.rss = (providerStats.rss ?? 0) + ingested.inserted;
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

  const clusterResult = await clusterRecentSignals(30).catch(() => ({
    eventsCreated: 0,
    eventsUpdated: 0,
    signalsProcessed: 0,
    signalsClustered: 0,
    duplicatesMerged: 0,
    skipped: true,
    analytics: {
      signalsFetched: 0,
      unprocessedCount: 0,
      pairsCompared: 0,
      duplicatePairs: 0,
      clustersFormed: 0,
      singletonClusters: 0,
      multiSourceClusters: 0,
      avgClusterSize: 0,
      avgSimilarity: 0,
      method: "keyword_tfidf" as const,
      sourceConfidenceAvg: 0,
    },
  }));

  const supabase = createAdminServerClient();
  const status =
    inserted > 0
      ? deadline.timedOutSafely
        ? "partial_timeout"
        : "success"
      : totalFetched > 0
        ? "partial"
        : "empty";

  const { data: logRow } = await supabase
    .from("ingestion_logs")
    .insert({
      status,
      total_fetched: totalFetched,
      total_valid: totalFetched - failedValidation,
      inserted,
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
        events_clustered: clusterResult.eventsCreated,
        duplicates_merged: clusterResult.duplicatesMerged,
        clustering_analytics: clusterResult.analytics,
        newsroom_layers: ["news_signals", "news_events"],
        scalable: true,
      },
    })
    .select("id")
    .single();

  const normalized = validationStats.sanitized;

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
    eventsClustered: clusterResult.eventsCreated,
    duplicatesMerged: clusterResult.duplicatesMerged,
    clusteringAnalytics: clusterResult.analytics,
    durationMs,
    completedProviders,
    skippedProviders,
    timedOutSafely: deadline.timedOutSafely,
    validationReasons: validationStats.reasons,
  });

  return {
    ok: inserted > 0 || totalFetched > 0,
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
  };
}

export function triggerAiProcessing(requestUrl: string): void {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret || !process.env.OPENAI_API_KEY?.trim()) return;

  const origin = new URL(requestUrl).origin;
  const url = `${origin}/api/process-ai`;

  fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/json",
    },
  }).catch(() => null);
}
