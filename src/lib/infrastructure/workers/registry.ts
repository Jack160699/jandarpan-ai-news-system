/**
 * Queue workers — ingest, AI, editorial, images
 */

import {
  isAnyChatProviderConfigured,
  isLocalEnrichEnabled,
} from "@/lib/ai/providers";
import { INFRA_CONFIG } from "@/lib/infrastructure/config";
import { logIngestionAnalytics } from "@/lib/infrastructure/analytics/ingestion";
import { saveQueueCheckpoint } from "@/lib/infrastructure/queue/checkpoint";
import { monitorWorkerResult } from "@/lib/observability/worker-monitor";
import { revalidateNewsroomCaches } from "@/lib/infrastructure/cache/isr";
import {
  completeWorkerResult,
  partialWorkerResult,
  shouldSkipForDeadline,
  skippedWorkerResult,
} from "@/lib/infrastructure/workers/deadline-aware";
import { processAiQueueBatch } from "@/lib/news/ai/process";
import { countPendingAiQueue } from "@/lib/news/ai/queue";
import { generateEditorialsFromEvents } from "@/lib/news/ai/generate-article";
import {
  countPendingEditorialImages,
  processEditorialImageQueue,
} from "@/lib/news/ai/generate-editorial-image";
import { runScalableIngestion } from "@/lib/news/pipeline/scalable-ingest";
import { INTELLIGENCE_WORKERS } from "@/lib/infrastructure/workers/intelligence-workers";
import type { QueueWorker, WorkerContext, WorkerResult } from "@/lib/infrastructure/workers/types";

async function runIngestWorker(ctx: WorkerContext): Promise<WorkerResult> {
  const started = Date.now();
  if (shouldSkipForDeadline(ctx.deadline, INFRA_CONFIG.workerDeadlineReserveMs)) {
    return skippedWorkerResult("ingest", started, ctx.deadline, "deadline_precheck");
  }

  const result = await runScalableIngestion(ctx.deadline);

  return completeWorkerResult("ingest", started, ctx.deadline, {
    recordsProcessed: result.inserted,
    recordsSkipped: 0,
    partial: result.timedOutSafely,
    extra: {
      inserted: result.inserted,
      signalsInserted: result.signalsInserted,
      totalFetched: result.totalFetched,
      queuedForAI: result.queuedForAI,
      timedOutSafely: result.timedOutSafely,
      completedProviders: result.completedProviders,
      logId: result.logId,
    },
  });
}

async function runAiWorker(ctx: WorkerContext): Promise<WorkerResult> {
  const started = Date.now();
  if (!isAnyChatProviderConfigured() && !isLocalEnrichEnabled()) {
    return skippedWorkerResult("ai_enrich", started, ctx.deadline, "no_ai_providers");
  }

  if (shouldSkipForDeadline(ctx.deadline, INFRA_CONFIG.workerDeadlineReserveMs)) {
    const pending = await countPendingAiQueue();
    return skippedWorkerResult("ai_enrich", started, ctx.deadline, "deadline_precheck", pending);
  }

  const batch = INFRA_CONFIG.aiQueueBatch;
  const result = await processAiQueueBatch(batch, { deadline: ctx.deadline });
  const pending = await countPendingAiQueue();

  await saveQueueCheckpoint({
    worker: "ai_enrich",
    lastRunAt: new Date().toISOString(),
    recordsProcessed: result.processed,
    recordsSkipped: result.skipped,
    remainingQueue: pending,
    partial: result.partial ?? false,
    durationMs: Date.now() - started,
    recordsPerSec:
      Date.now() - started > 0
        ? Math.round((result.processed / (Date.now() - started)) * 1000 * 100) / 100
        : 0,
    batchCount: result.batchCount ?? 1,
  });

  const build = result.partial ? partialWorkerResult : completeWorkerResult;
  return build("ai_enrich", started, ctx.deadline, {
    recordsProcessed: result.processed,
    recordsSkipped: result.skipped,
    remainingQueue: pending,
    partial: result.partial ?? false,
    extra: {
      pending,
      localFallback: result.localFallback,
      cloudSuccess: result.cloudSuccess,
      ...(result.released != null ? { released: result.released } : {}),
      ...(result.batchCount != null ? { batchCount: result.batchCount } : {}),
      errors: result.errors.slice(0, 5),
    },
  });
}

async function runEditorialWorker(ctx: WorkerContext): Promise<WorkerResult> {
  const started = Date.now();
  if (process.env.NEWSROOM_GENERATE_ARTICLES !== "true") {
    return skippedWorkerResult("editorial_generate", started, ctx.deadline, "not_enabled");
  }

  if (!process.env.OPENAI_API_KEY?.trim()) {
    return skippedWorkerResult("editorial_generate", started, ctx.deadline, "no_openai_key");
  }

  if (shouldSkipForDeadline(ctx.deadline, INFRA_CONFIG.workerDeadlineReserveMs)) {
    return skippedWorkerResult("editorial_generate", started, ctx.deadline, "deadline_precheck");
  }

  const result = await generateEditorialsFromEvents({
    limit: INFRA_CONFIG.editorialBatchLimit,
  });

  if (result.published > 0) {
    await revalidateNewsroomCaches({ publishedStories: result.published });
  }

  return completeWorkerResult("editorial_generate", started, ctx.deadline, {
    recordsProcessed: result.published,
    recordsSkipped: result.rejected,
    partial: false,
    extra: {
      published: result.published,
      rejected: result.rejected,
      generated: result.generated,
      avgConfidence: result.avgConfidence,
      concurrency: INFRA_CONFIG.editorialConcurrency,
    },
  });
}

async function runImagesWorker(ctx: WorkerContext): Promise<WorkerResult> {
  const started = Date.now();
  const pending = await countPendingEditorialImages();

  if (!pending) {
    return skippedWorkerResult("editorial_images", started, ctx.deadline, "queue_empty", 0);
  }

  if (
    !ctx.deadline.hasBudgetFor(INFRA_CONFIG.editorialImagesDeadlineThresholdMs)
  ) {
    return skippedWorkerResult(
      "editorial_images",
      started,
      ctx.deadline,
      "deadline_budget",
      pending
    );
  }

  const result = await processEditorialImageQueue(INFRA_CONFIG.imageQueueBatch, {
    deadline: ctx.deadline,
    concurrency: INFRA_CONFIG.imageQueueConcurrency,
  });
  const remaining = await countPendingEditorialImages();

  await saveQueueCheckpoint({
    worker: "editorial_images",
    lastRunAt: new Date().toISOString(),
    recordsProcessed: result.completed,
    recordsSkipped: result.skipped,
    remainingQueue: remaining,
    partial: result.partial ?? false,
    durationMs: Date.now() - started,
    recordsPerSec:
      Date.now() - started > 0
        ? Math.round((result.completed / (Date.now() - started)) * 1000 * 100) / 100
        : 0,
    batchCount: 1,
  });

  const build = result.partial ? partialWorkerResult : completeWorkerResult;
  return build("editorial_images", started, ctx.deadline, {
    recordsProcessed: result.completed,
    recordsSkipped: result.skipped + result.failed,
    remainingQueue: remaining,
    partial: result.partial ?? false,
    extra: {
      processed: result.processed,
      completed: result.completed,
      failed: result.failed,
      ...(result.released != null ? { released: result.released } : {}),
      pending: remaining,
    },
  });
}

export const QUEUE_WORKERS: QueueWorker[] = [
  { id: "ingest", label: "Scalable ingestion", run: runIngestWorker },
  { id: "ai_enrich", label: "AI enrichment queue", run: runAiWorker },
  {
    id: "editorial_generate",
    label: "Editorial generation",
    run: runEditorialWorker,
  },
  { id: "editorial_images", label: "Editorial images", run: runImagesWorker },
  ...INTELLIGENCE_WORKERS,
];

export async function runQueueWorker(
  workerId: QueueWorker["id"],
  ctx: WorkerContext
): Promise<WorkerResult> {
  const worker = QUEUE_WORKERS.find((w) => w.id === workerId);
  if (!worker) {
    return {
      worker: workerId,
      ok: false,
      durationMs: 0,
      error: "unknown_worker",
    };
  }

  logIngestionAnalytics({
    event: "worker_start",
    worker: workerId,
    metadata: { deadlineRemaining: ctx.deadline.remainingMs() },
  });

  try {
    const result = await worker.run(ctx);
    logIngestionAnalytics({
      event: "worker_complete",
      worker: workerId,
      durationMs: result.durationMs,
      metadata: result.metadata,
    });
    return monitorWorkerResult(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "worker_failed";
    logIngestionAnalytics({
      event: "worker_complete",
      worker: workerId,
      error: msg,
    });
    const failed = {
      worker: workerId,
      ok: false,
      durationMs: Date.now() - ctx.deadline.startedAt,
      error: msg,
    } satisfies WorkerResult;
    return monitorWorkerResult(failed);
  }
}
