/**
 * fetch-worker spec: runScalableIngestion over ONE shard of the RSS feeds (API providers on shard 0 only).
 * Wraps EXISTING pipeline code only (no logic is reimplemented).
 */

import { buildQueueHealthSnapshot } from "@/lib/infrastructure/queue/health-manager";
import { hasAnyNewsProviderConfigured } from "@/lib/news/env";
import { classifyIngestionOutcome } from "@/lib/news/pipeline/ingestion-outcome";
import { runScalableIngestion } from "@/lib/news/pipeline/scalable-ingest";
import { createExecutionDeadline } from "@/lib/serverless/deadline";
import type { WorkerSpec } from "@/lib/edge/worker-kit/kit";

const asInt = (v: unknown, fallback: number, min: number, max: number): number => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.floor(n))) : fallback;
};

export type FetchParams = { shard: number; shards: number };

export const FETCH_SPEC: WorkerSpec<FetchParams> = {
  job: "fetch-news",
  parse(body, env) {
    const shards = asInt(body.shards, asInt(env.EDGE_FETCH_SHARDS, 1, 1, 12), 1, 12);
    const shard = asInt(body.shard, 0, 0, shards - 1);
    if (body.shard !== undefined && Number(body.shard) >= shards) return { ok: false, reason: "shard_out_of_range" };
    return { ok: true, params: { shard, shards }, leaseKey: `edge-fetch-${shards}-${shard}`, label: { shard, shards } };
  },
  async precheck(_params, _deps) {
    // Same protective skip as the Vercel route: do not add signals while the AI queue is saturated.
    const health = await buildQueueHealthSnapshot().catch(() => null);
    return health?.pauseIngestion ? { reason: "queue_backpressure", details: { queueHealth: health as unknown as Record<string, unknown> } } : null;
  },
  async run({ params }) {
    const startedAt = Date.now();
    // API providers (NewsData/GNews) are quota-limited: only shard 0, and only when a key exists.
    const apiOnThisShard = params.shard === 0 && hasAnyNewsProviderConfigured();
    // 95 s budget x INGEST_STOP_RATIO (0.82) = no new RSS batch after ~78 s, leaving ample room before the 135 s worker deadline.
    const deadline = createExecutionDeadline(95_000);
    const result = await runScalableIngestion(deadline, {
      rssShard: { index: params.shard, count: params.shards },
      skipApiProviders: !apiOnThisShard,
    });

    const persistenceSucceeded = !(result.allBatchesFailed || result.persistenceFailed);
    // No cache purge on signal insertion: signals do not appear on any list page, and purging here forced every list /
    // hub / sitemap read to be re-fetched after nearly every 10-minute ingest cycle. Publishing (editorial worker) purges.

    // Nothing attempted = no feed in this shard was due/assigned (and no provider ran): "no_work", not a failure.
    const nothingAttempted =
      result.healthySources.length === 0 &&
      result.failedSources.length === 0 &&
      result.errors.length === 0 &&
      result.completedProviders.length === 0 &&
      result.totalFetched === 0;

    const outcome = classifyIngestionOutcome({
      nothingAttempted,
      fetched: result.totalFetched,
      inserted: result.inserted,
      signalsInserted: result.signalsInserted,
      duplicates: result.skippedDuplicates,
      rejected: result.failedValidation,
      queuedForAI: result.queuedForAI,
      completedProviders: result.completedProviders,
      skippedProviders: result.skippedProviders,
      errors: result.errors,
      timedOutSafely: result.timedOutSafely,
      persistenceSucceeded,
      startedAt,
      completedAt: Date.now(),
    });

    return {
      ok: outcome.status !== "failed",
      degraded: outcome.degraded,
      processed: result.inserted + result.signalsInserted,
      failed: outcome.status === "failed" ? 1 : 0,
      skipped: outcome.classification === "no_work" ? 1 : 0,
      error: outcome.status === "failed" ? (result.errors[0] ?? "ingestion_failed").slice(0, 200) : undefined,
      details: {
        fetched: result.totalFetched,
        signals_inserted: result.signalsInserted,
        legacy_inserted: result.inserted,
        duplicates: result.skippedDuplicates,
        failed_validation: result.failedValidation,
        failed_batches: result.failedBatches,
        providers_completed: result.completedProviders,
        providers_skipped: result.skippedProviders,
        timed_out_safely: result.timedOutSafely,
        healthy_feeds: result.healthySources.length,
        failed_feeds: result.failedSources.length,
        classification: outcome.classification,
        // Explicit outcome vocabulary shared with the editorial worker and the admin failure center.
        outcome: outcome.classification === "no_work" ? "no_work" : outcome.status === "failed" ? "failure" : outcome.status === "degraded" ? "degraded" : "ok",
        api_providers_ran: apiOnThisShard,
        errors: result.errors.slice(0, 5).map((e) => e.slice(0, 160)),
      },
    };
  },
};
