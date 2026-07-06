/**
 * Deadline-aware worker helpers — partial completion, observability metadata
 */

import type { ExecutionDeadline } from "@/lib/serverless/deadline";
import type { WorkerId, WorkerResult } from "@/lib/infrastructure/workers/types";
import type { JsonObject } from "@/types/json";

export type WorkerObservabilityFields = {
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  recordsProcessed?: number;
  recordsSkipped?: number;
  remainingQueue?: number;
  deadlineRemaining?: number;
  reasonIfSkipped?: string;
  status?: "complete" | "partial" | "degraded" | "skipped";
  recordsPerSec?: number;
  batchDurationMs?: number;
};

export type WorkerRunStats = {
  recordsProcessed: number;
  recordsSkipped: number;
  partial: boolean;
  reasonIfSkipped?: string;
};

export function buildWorkerObservability(
  started: number,
  deadline: ExecutionDeadline,
  stats: Partial<WorkerRunStats> & {
    remainingQueue?: number;
    batchDurationMs?: number;
  }
): WorkerObservabilityFields {
  const finishedAt = Date.now();
  const durationMs = finishedAt - started;
  const recordsProcessed = stats.recordsProcessed ?? 0;
  const recordsPerSec =
    durationMs > 0 ? Math.round((recordsProcessed / durationMs) * 1000 * 100) / 100 : 0;

  let status: WorkerObservabilityFields["status"] = "complete";
  if (stats.reasonIfSkipped) status = "skipped";
  else if (stats.partial) status = "partial";
  else if (deadline.timedOutSafely) status = "degraded";

  return {
    startedAt: new Date(started).toISOString(),
    finishedAt: new Date(finishedAt).toISOString(),
    durationMs,
    recordsProcessed,
    recordsSkipped: stats.recordsSkipped,
    remainingQueue: stats.remainingQueue,
    deadlineRemaining: deadline.remainingMs(),
    reasonIfSkipped: stats.reasonIfSkipped,
    status,
    recordsPerSec,
    batchDurationMs: stats.batchDurationMs,
  };
}

export function mergeWorkerMetadata(
  observability: WorkerObservabilityFields,
  extra?: JsonObject
): JsonObject {
  return { ...observability, ...extra };
}

export function skippedWorkerResult(
  worker: WorkerId,
  started: number,
  deadline: ExecutionDeadline,
  reason: string,
  remainingQueue?: number
): WorkerResult {
  const obs = buildWorkerObservability(started, deadline, {
    recordsProcessed: 0,
    recordsSkipped: 0,
    reasonIfSkipped: reason,
    remainingQueue,
  });
  return {
    worker,
    ok: true,
    durationMs: obs.durationMs,
    skipped: true,
    metadata: mergeWorkerMetadata(obs, { reason }),
  };
}

export function partialWorkerResult(
  worker: WorkerId,
  started: number,
  deadline: ExecutionDeadline,
  stats: WorkerRunStats & { remainingQueue?: number; extra?: JsonObject }
): WorkerResult {
  const obs = buildWorkerObservability(started, deadline, stats);
  return {
    worker,
    ok: true,
    durationMs: obs.durationMs,
    metadata: mergeWorkerMetadata(obs, {
      partial: stats.partial,
      ...stats.extra,
    }),
  };
}

export function completeWorkerResult(
  worker: WorkerId,
  started: number,
  deadline: ExecutionDeadline,
  stats: WorkerRunStats & { remainingQueue?: number; extra?: JsonObject }
): WorkerResult {
  const obs = buildWorkerObservability(started, deadline, stats);
  return {
    worker,
    ok: true,
    durationMs: obs.durationMs,
    metadata: mergeWorkerMetadata(obs, stats.extra),
  };
}

export function shouldSkipForDeadline(
  deadline: ExecutionDeadline,
  reserveMs: number
): boolean {
  return !deadline.hasBudgetFor(reserveMs);
}
