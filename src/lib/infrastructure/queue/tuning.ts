/**
 * Adaptive queue tuning — batch size, concurrency, micro-batching, ETA
 */

import { INFRA_CONFIG } from "@/lib/infrastructure/config";
import type { ExecutionDeadline } from "@/lib/serverless/deadline";
import type { QueueDrainMetric } from "@/lib/observability/types";

export type TuningInput = {
  pending: number;
  deadline?: ExecutionDeadline;
  /** Estimated ms per item for this worker */
  avgItemMs?: number;
  reserveMs?: number;
};

export type WorkerTuning = {
  batchSize: number;
  microBatchSize: number;
  concurrency: number;
  reason: string;
};

const AI_AVG_ITEM_MS = Number(process.env.AI_QUEUE_AVG_ITEM_MS) || 1_200;
const IMAGE_AVG_ITEM_MS = Number(process.env.IMAGE_QUEUE_AVG_ITEM_MS) || 12_000;

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

/** Scale batch up when backlog is high; down when deadline is tight */
export function computeAdaptiveBatchSize(input: TuningInput & {
  baseBatch: number;
  maxBatch: number;
  minBatch?: number;
}): number {
  const { pending, deadline, baseBatch, maxBatch, minBatch = 1, avgItemMs = AI_AVG_ITEM_MS, reserveMs = INFRA_CONFIG.workerDeadlineReserveMs } = input;

  if (pending <= 0) return 0;

  let size = baseBatch;

  if (pending > 10_000) size = Math.round(baseBatch * 2.5);
  else if (pending > 5_000) size = Math.round(baseBatch * 2);
  else if (pending > 1_000) size = Math.round(baseBatch * 1.5);
  else if (pending < 50) size = Math.max(minBatch, Math.round(baseBatch * 0.6));

  if (deadline) {
    const budget = deadline.remainingMs() - reserveMs;
    const deadlineCap = Math.max(minBatch, Math.floor(budget / Math.max(avgItemMs, 500)));
    size = Math.min(size, deadlineCap);
  }

  return clamp(Math.round(size), minBatch, maxBatch);
}

export function computeAdaptiveMicroBatch(input: TuningInput & {
  batchSize: number;
  baseMicro: number;
  maxMicro: number;
}): number {
  const { batchSize, pending, deadline, baseMicro, maxMicro, avgItemMs = AI_AVG_ITEM_MS, reserveMs = INFRA_CONFIG.workerDeadlineReserveMs } = input;

  let micro = baseMicro;
  if (pending > 5_000) micro = Math.round(baseMicro * 2);
  if (pending > 10_000) micro = Math.round(baseMicro * 3);

  if (deadline) {
    const budget = deadline.remainingMs() - reserveMs;
    const cap = Math.max(1, Math.floor(budget / Math.max(avgItemMs, 500)));
    micro = Math.min(micro, cap, batchSize);
  }

  return clamp(micro, 1, Math.min(maxMicro, batchSize));
}

export function computeAdaptiveConcurrency(input: TuningInput & {
  baseConcurrency: number;
  maxConcurrency: number;
}): number {
  const { pending, baseConcurrency, maxConcurrency } = input;

  let c = baseConcurrency;
  if (pending > 500) c = baseConcurrency + 1;
  if (pending > 1_500) c = baseConcurrency + 2;
  if (pending < 20) c = Math.max(1, baseConcurrency - 1);

  return clamp(c, 1, maxConcurrency);
}

export function resolveAiWorkerTuning(
  pending: number,
  deadline?: ExecutionDeadline
): WorkerTuning {
  const batchSize = computeAdaptiveBatchSize({
    pending,
    deadline,
    baseBatch: INFRA_CONFIG.aiQueueBatch,
    maxBatch: INFRA_CONFIG.aiQueueBatchMax,
    minBatch: 5,
    avgItemMs: AI_AVG_ITEM_MS,
  });

  const microBatchSize = computeAdaptiveMicroBatch({
    pending,
    deadline,
    batchSize,
    baseMicro: INFRA_CONFIG.aiQueueMicroBatch,
    maxMicro: INFRA_CONFIG.aiQueueMicroBatchMax,
    avgItemMs: AI_AVG_ITEM_MS,
  });

  return {
    batchSize,
    microBatchSize,
    concurrency: microBatchSize,
    reason: `pending=${pending},batch=${batchSize},micro=${microBatchSize}`,
  };
}

export function resolveImageWorkerTuning(
  pending: number,
  deadline?: ExecutionDeadline,
  bonusBudgetMs = 0
): WorkerTuning {
  const effectiveReserve = Math.max(
    5_000,
    INFRA_CONFIG.editorialImagesDeadlineThresholdMs - bonusBudgetMs
  );

  const batchSize = computeAdaptiveBatchSize({
    pending,
    deadline,
    baseBatch: INFRA_CONFIG.imageQueueBatch,
    maxBatch: INFRA_CONFIG.imageQueueBatchMax,
    minBatch: 2,
    avgItemMs: IMAGE_AVG_ITEM_MS,
    reserveMs: effectiveReserve,
  });

  const concurrency = computeAdaptiveConcurrency({
    pending,
    baseConcurrency: INFRA_CONFIG.imageQueueConcurrency,
    maxConcurrency: INFRA_CONFIG.imageQueueConcurrencyMax,
  });

  return {
    batchSize,
    microBatchSize: 1,
    concurrency,
    reason: `pending=${pending},batch=${batchSize},concurrency=${concurrency}`,
  };
}

/** Drain rate from recent samples (items/hour) */
export function computeDrainPerHour(
  samples: QueueDrainMetric[],
  worker: string,
  windowMs = 3_600_000
): number {
  const cutoff = Date.now() - windowMs;
  const relevant = samples.filter(
    (s) => s.worker === worker && new Date(s.ts).getTime() >= cutoff
  );
  if (!relevant.length) return 0;

  const totalProcessed = relevant.reduce((a, s) => a + s.recordsProcessed, 0);
  const earliest = Math.min(...relevant.map((s) => new Date(s.ts).getTime()));
  const spanHours = Math.max(0.05, (Date.now() - earliest) / 3_600_000);
  return Math.round((totalProcessed / spanHours) * 10) / 10;
}

export type QueueEta = {
  pending: number;
  drainPerHour: number;
  etaHours: number | null;
  etaLabel: string;
};

export function computeQueueEta(pending: number, drainPerHour: number): QueueEta {
  if (pending <= 0) {
    return { pending: 0, drainPerHour, etaHours: 0, etaLabel: "empty" };
  }
  if (drainPerHour <= 0) {
    return { pending, drainPerHour: 0, etaHours: null, etaLabel: "unknown" };
  }
  const etaHours = Math.round((pending / drainPerHour) * 100) / 100;
  const etaLabel =
    etaHours < 1
      ? `${Math.round(etaHours * 60)}m`
      : etaHours < 48
        ? `${Math.round(etaHours * 10) / 10}h`
        : `${Math.round(etaHours / 24)}d`;
  return { pending, drainPerHour, etaHours, etaLabel };
}

/** Estimate ms saved when a worker finishes faster than budgeted */
const WORKER_BUDGET_ESTIMATES_MS: Partial<Record<string, number>> = {
  ai_enrich: 18_000,
  job_processor: 4_000,
  intelligence_embed: 6_000,
  intelligence_snapshot: 5_000,
  analytics_aggregate: 4_000,
};

export function estimateBudgetSurplus(
  workerId: string,
  durationMs: number,
  skipped: boolean
): number {
  if (skipped) return 0;
  const estimate = WORKER_BUDGET_ESTIMATES_MS[workerId] ?? 5_000;
  if (durationMs >= estimate * 0.7) return 0;
  return Math.round(estimate - durationMs);
}
