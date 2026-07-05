/**
 * Cron orchestration — deadline-aware worker ordering with graceful degradation
 */

import { INFRA_CONFIG } from "@/lib/infrastructure/config";
import { logIngestionAnalytics } from "@/lib/infrastructure/analytics/ingestion";
import { recordCronRun } from "@/lib/observability/cron-monitor";
import { revalidateNewsroomCaches } from "@/lib/infrastructure/cache/isr";
import {
  QUEUE_WORKERS,
  runQueueWorker,
} from "@/lib/infrastructure/workers/registry";
import {
  buildWorkerObservability,
  mergeWorkerMetadata,
} from "@/lib/infrastructure/workers/deadline-aware";
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

/** Lightweight workers first; editorial_images last (heavy ~10-15s each) */
export const INTELLIGENCE_PIPELINE: WorkerId[] = [
  "ai_enrich",
  "job_processor",
  "intelligence_embed",
  "intelligence_snapshot",
  "analytics_aggregate",
  "editorial_images",
];

const DEFAULT_PIPELINE: WorkerId[] = INTELLIGENCE_PIPELINE;

const HEAVY_WORKERS = new Set<WorkerId>(["editorial_images"]);

function shouldSkipHeavyWorker(
  workerId: WorkerId,
  deadline: ReturnType<typeof createExecutionDeadline>
): { skip: boolean; reason?: string } {
  if (!HEAVY_WORKERS.has(workerId)) {
    if (!deadline.hasBudgetFor(INFRA_CONFIG.workerDeadlineReserveMs)) {
      return { skip: true, reason: "deadline_budget" };
    }
    return { skip: false };
  }

  if (
    !deadline.hasBudgetFor(INFRA_CONFIG.editorialImagesDeadlineThresholdMs)
  ) {
    return { skip: true, reason: "deadline_budget" };
  }

  return { skip: false };
}

function buildSkippedResult(
  workerId: WorkerId,
  started: number,
  deadline: ReturnType<typeof createExecutionDeadline>,
  reason: string
): WorkerResult {
  const obs = buildWorkerObservability(started, deadline, {
    recordsProcessed: 0,
    recordsSkipped: 0,
    reasonIfSkipped: reason,
  });
  return {
    worker: workerId,
    ok: true,
    durationMs: obs.durationMs,
    skipped: true,
    metadata: mergeWorkerMetadata(obs, {
      reason,
      status: reason === "deadline_budget" ? "degraded" : "skipped",
    }),
  };
}

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
    metadata: {
      workers: workerIds,
      budgetMs: deadline.maxDurationMs,
      stopAtMs: deadline.stopAtMs,
    },
  });

  for (const id of workerIds) {
    const workerStarted = Date.now();
    const budgetCheck = shouldSkipHeavyWorker(id, deadline);

    if (budgetCheck.skip) {
      degraded = true;
      results.push(
        buildSkippedResult(id, workerStarted, deadline, budgetCheck.reason!)
      );
      logIngestionAnalytics({
        event: "worker_skipped",
        worker: id,
        metadata: {
          reason: budgetCheck.reason,
          deadlineRemaining: deadline.remainingMs(),
        },
      });
      continue;
    }

    const result = await runQueueWorker(id, { deadline, requestUrl: options.requestUrl });
    results.push(result);

    if (result.metadata?.status === "partial" || result.metadata?.status === "degraded") {
      degraded = true;
    }
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
        status: r.metadata?.status,
        recordsProcessed: r.metadata?.recordsProcessed,
        deadlineRemaining: r.metadata?.deadlineRemaining,
        reasonIfSkipped: r.metadata?.reasonIfSkipped,
      })),
      timedOutSafely: deadline.timedOutSafely,
      degraded,
      deadlineRemaining: deadline.remainingMs(),
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
