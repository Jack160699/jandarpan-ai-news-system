/**
 * Worker monitoring — wraps queue worker results with metrics + alerts
 */

import { recordWorkerMetric, recordQueueDrainMetric } from "@/lib/observability/metrics";
import { trackOpsError } from "@/lib/observability/errors";
import type { WorkerResult } from "@/lib/infrastructure/workers/types";
import type { JsonObject } from "@/types/json";

function extractObservability(metadata?: JsonObject) {
  if (!metadata) return {};
  return {
    startedAt: metadata.startedAt as string | undefined,
    finishedAt: metadata.finishedAt as string | undefined,
    recordsProcessed: metadata.recordsProcessed as number | undefined,
    recordsSkipped: metadata.recordsSkipped as number | undefined,
    remainingQueue: metadata.remainingQueue as number | undefined,
    deadlineRemaining: metadata.deadlineRemaining as number | undefined,
    reasonIfSkipped: metadata.reasonIfSkipped as string | undefined,
    status: metadata.status as string | undefined,
    recordsPerSec: metadata.recordsPerSec as number | undefined,
    batchDurationMs: metadata.batchDurationMs as number | undefined,
  };
}

export async function monitorWorkerResult(
  result: WorkerResult,
  requestId?: string
): Promise<WorkerResult> {
  const obs = extractObservability(result.metadata);
  const ts = obs.finishedAt ?? new Date().toISOString();

  await recordWorkerMetric({
    worker: result.worker,
    ok: result.ok,
    durationMs: result.durationMs,
    skipped: result.skipped,
    ts,
    ...obs,
  });

  if (
    obs.recordsProcessed != null &&
    obs.recordsProcessed > 0 &&
    !result.skipped
  ) {
    await recordQueueDrainMetric({
      worker: result.worker,
      recordsProcessed: obs.recordsProcessed,
      recordsSkipped: obs.recordsSkipped ?? 0,
      remainingQueue: obs.remainingQueue ?? 0,
      durationMs: result.durationMs,
      recordsPerSec: obs.recordsPerSec ?? 0,
      batchCount: 1,
      partial: obs.status === "partial",
      ts,
    });
  }

  if (!result.ok && !result.skipped && result.error) {
    await trackOpsError({
      source: "worker",
      worker: result.worker,
      message: `Worker ${result.worker} failed: ${result.error}`,
      severity: result.worker === "ingest" ? "high" : "medium",
      requestId,
      metadata: result.metadata,
    });
  }

  return result;
}
