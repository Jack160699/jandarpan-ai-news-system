/**
 * Cron orchestration — ordered workers with deadline + graceful degradation
 */

import { INFRA_CONFIG } from "@/lib/infrastructure/config";
import { logIngestionAnalytics } from "@/lib/infrastructure/analytics/ingestion";
import { recordCronRun } from "@/lib/observability/cron-monitor";
import { revalidateNewsroomCaches } from "@/lib/infrastructure/cache/isr";
import {
  QUEUE_WORKERS,
  runQueueWorker,
} from "@/lib/infrastructure/workers/registry";
import type { WorkerId, WorkerResult } from "@/lib/infrastructure/workers/types";
import { createExecutionDeadline } from "@/lib/serverless/deadline";

export type OrchestrateOptions = {
  requestUrl: string;
  /** Subset of workers; default full pipeline */
  workers?: WorkerId[];
  skipRevalidate?: boolean;
};

export type OrchestrateResult = {
  ok: boolean;
  durationMs: number;
  timedOutSafely: boolean;
  workers: WorkerResult[];
  degraded: boolean;
};

const DEFAULT_PIPELINE: WorkerId[] = [
  "ingest",
  "editorial_generate",
  "ai_enrich",
  "editorial_images",
  "job_processor",
  "intelligence_embed",
  "intelligence_snapshot",
  "analytics_aggregate",
];

export async function runCronOrchestration(
  options: OrchestrateOptions
): Promise<OrchestrateResult> {
  const started = Date.now();
  const deadline = createExecutionDeadline(INFRA_CONFIG.ingestBudgetMs);
  const workerIds = options.workers ?? DEFAULT_PIPELINE;
  const results: WorkerResult[] = [];
  let degraded = false;

  logIngestionAnalytics({
    event: "orchestrate_start",
    metadata: { workers: workerIds },
  });

  for (const id of workerIds) {
    if (deadline.shouldStop()) {
      degraded = true;
      results.push({
        worker: id,
        ok: false,
        durationMs: 0,
        skipped: true,
        error: "orchestrator_deadline",
      });
      continue;
    }

    const result = await runQueueWorker(id, {
      deadline,
      requestUrl: options.requestUrl,
    });
    results.push(result);

    if (!result.ok && !result.skipped) {
      degraded = true;
    }
  }

  if (!options.skipRevalidate) {
    const published = results.find((r) => r.worker === "editorial_generate")
      ?.metadata?.published as number | undefined;
    const ingestInserted = results.find((r) => r.worker === "ingest")?.metadata
      ?.inserted as number | undefined;

    if ((published ?? 0) > 0 || (ingestInserted ?? 0) > 0) {
      await revalidateNewsroomCaches({ publishedStories: published ?? 0 });
      const { refreshSnapshotFromDatabase } = await import(
        "@/lib/news/live-feed/resolve-pool"
      );
      await refreshSnapshotFromDatabase(120).catch(() => null);
    }
  }

  const durationMs = Date.now() - started;
  const ok = results.some((r) => r.ok && !r.skipped);

  logIngestionAnalytics({
    event: "orchestrate_complete",
    durationMs,
    metadata: {
      workers: results.map((r) => ({
        id: r.worker,
        ok: r.ok,
        skipped: r.skipped,
        ms: r.durationMs,
      })),
      timedOutSafely: deadline.timedOutSafely,
      degraded,
    },
  });

  const result = {
    ok,
    durationMs,
    timedOutSafely: deadline.timedOutSafely,
    workers: results,
    degraded,
  };

  await recordCronRun({
    job: "orchestrate",
    ok,
    startedAt: new Date(started).toISOString(),
    durationMs,
    degraded,
    workers: results,
  });

  return result;
}

export function listWorkers() {
  return QUEUE_WORKERS.map((w) => ({ id: w.id, label: w.label }));
}
