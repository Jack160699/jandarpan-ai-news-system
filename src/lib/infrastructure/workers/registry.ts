/**
 * Queue workers — ingest, AI, editorial, images
 */

import {
  isAnyChatProviderConfigured,
  isLocalEnrichEnabled,
} from "@/lib/ai/providers";
import { resolveDirectEditorialGate } from "@/lib/infrastructure/cron/editorial-generate-policy";
import { INFRA_CONFIG } from "@/lib/infrastructure/config";
import { logIngestionAnalytics } from "@/lib/infrastructure/analytics/ingestion";
import { saveQueueCheckpoint } from "@/lib/infrastructure/queue/checkpoint";
import {
  resolveAiWorkerTuning,
  resolveImageWorkerTuning,
} from "@/lib/infrastructure/queue/tuning";
import { recordPerfAudit } from "@/lib/observability/queue-analytics";
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
import { buildQueueHealthSnapshot } from "@/lib/infrastructure/queue/health-manager";
import { INTELLIGENCE_WORKERS } from "@/lib/infrastructure/workers/intelligence-workers";
import type { QueueWorker, WorkerContext, WorkerResult } from "@/lib/infrastructure/workers/types";

async function runIngestWorker(ctx: WorkerContext): Promise<WorkerResult> {
  const started = Date.now();
  if (shouldSkipForDeadline(ctx.deadline, INFRA_CONFIG.workerDeadlineReserveMs)) {
    return skippedWorkerResult("ingest", started, ctx.deadline, "deadline_precheck");
  }

  const health = await buildQueueHealthSnapshot().catch(() => null);
  if (health?.pauseIngestion) {
    const skipped = skippedWorkerResult(
      "ingest",
      started,
      ctx.deadline,
      "queue_backpressure",
      0
    );
    return {
      ...skipped,
      metadata: {
        ...(skipped.metadata ?? {}),
        queueHealth: health,
      },
    };
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

  let totalProcessed = 0;
  let totalSkipped = 0;
  let localFallback = 0;
  let cloudSuccess = 0;
  let released = 0;
  let batchCount = 0;
  let partial = false;
  const errors: string[] = [];
  let loops = 0;
  const maxLoops = 5;

  while (loops < maxLoops) {
    loops++;
    const pending = await countPendingAiQueue();
    if (!pending) break;
    if (ctx.deadline.shouldStop() || !ctx.deadline.hasBudgetFor(INFRA_CONFIG.workerDeadlineReserveMs)) {
      partial = true;
      break;
    }

    const tuning = resolveAiWorkerTuning(pending, ctx.deadline);
    const result = await processAiQueueBatch(tuning.batchSize, {
      deadline: ctx.deadline,
      microBatchSize: tuning.microBatchSize,
    });

    totalProcessed += result.processed;
    totalSkipped += result.skipped;
    localFallback += result.localFallback;
    cloudSuccess += result.cloudSuccess;
    released += result.released ?? 0;
    batchCount += result.batchCount ?? 1;
    errors.push(...result.errors.slice(0, 3));
    if (result.partial) {
      partial = true;
      break;
    }
    if (result.processed === 0) break;
  }

  const pending = await countPendingAiQueue();
  const durationMs = Date.now() - started;

  await saveQueueCheckpoint({
    worker: "ai_enrich",
    lastRunAt: new Date().toISOString(),
    recordsProcessed: totalProcessed,
    recordsSkipped: totalSkipped,
    remainingQueue: pending,
    partial,
    durationMs,
    recordsPerSec:
      durationMs > 0 ? Math.round((totalProcessed / durationMs) * 1000 * 100) / 100 : 0,
    batchCount,
  });

  await recordPerfAudit({
    worker: "ai_enrich",
    ts: new Date().toISOString(),
    recordsPerSec:
      durationMs > 0 ? Math.round((totalProcessed / durationMs) * 1000 * 100) / 100 : 0,
  });

  const build = partial ? partialWorkerResult : completeWorkerResult;
  return build("ai_enrich", started, ctx.deadline, {
    recordsProcessed: totalProcessed,
    recordsSkipped: totalSkipped,
    remainingQueue: pending,
    partial,
    extra: {
      pending,
      localFallback,
      cloudSuccess,
      released,
      batchCount,
      loops,
      errors: errors.slice(0, 5),
    },
  });
}

async function runEditorialWorker(ctx: WorkerContext): Promise<WorkerResult> {
  const started = Date.now();

  const gate = resolveDirectEditorialGate(
    ctx.editorialGenerateTrigger ?? "scheduled_cron"
  );
  if (!gate.allowed) {
    return skippedWorkerResult(
      "editorial_generate",
      started,
      ctx.deadline,
      gate.reason
    );
  }

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
  let pending = await countPendingEditorialImages();

  if (!pending) {
    return skippedWorkerResult("editorial_images", started, ctx.deadline, "queue_empty", 0);
  }

  const bonusBudgetMs = ctx.tuning?.bonusBudgetMs ?? 0;
  const effectiveThreshold = Math.max(
    8_000,
    INFRA_CONFIG.editorialImagesDeadlineThresholdMs - bonusBudgetMs
  );

  if (!ctx.deadline.hasBudgetFor(effectiveThreshold)) {
    return skippedWorkerResult(
      "editorial_images",
      started,
      ctx.deadline,
      "deadline_budget",
      pending
    );
  }

  let totalCompleted = 0;
  let totalFailed = 0;
  let totalRetried = 0;
  let totalSkipped = 0;
  let totalProcessed = 0;
  let released = 0;
  let partial = false;
  const errors: string[] = [];
  let loops = 0;
  const maxLoops = 6;
  const promptHashCache = new Map<string, { hero_image_url: string; og_image_url: string | null }>();

  while (loops < maxLoops) {
    loops++;
    pending = await countPendingEditorialImages();
    if (!pending) break;
    if (
      ctx.deadline.shouldStop() ||
      !ctx.deadline.hasBudgetFor(INFRA_CONFIG.workerDeadlineReserveMs)
    ) {
      partial = true;
      break;
    }

    const tuning = resolveImageWorkerTuning(pending, ctx.deadline, bonusBudgetMs);
    const result = await processEditorialImageQueue(tuning.batchSize, {
      deadline: ctx.deadline,
      concurrency: tuning.concurrency,
      promptHashCache,
    });

    totalCompleted += result.completed;
    totalFailed += result.failed;
    totalRetried += result.retried ?? 0;
    totalSkipped += result.skipped;
    totalProcessed += result.processed;
    released += result.released ?? 0;
    errors.push(...result.errors.slice(0, 3));

    if (result.partial) {
      partial = true;
      break;
    }
    if (result.processed === 0) break;
  }

  const remaining = await countPendingEditorialImages();
  const durationMs = Date.now() - started;

  await saveQueueCheckpoint({
    worker: "editorial_images",
    lastRunAt: new Date().toISOString(),
    recordsProcessed: totalCompleted,
    recordsSkipped: totalSkipped + totalFailed,
    remainingQueue: remaining,
    partial,
    durationMs,
    recordsPerSec:
      durationMs > 0 ? Math.round((totalCompleted / durationMs) * 1000 * 100) / 100 : 0,
    batchCount: loops,
  });

  await recordPerfAudit({
    worker: "editorial_images",
    ts: new Date().toISOString(),
    recordsPerSec:
      durationMs > 0 ? Math.round((totalCompleted / durationMs) * 1000 * 100) / 100 : 0,
  });

  const build = partial ? partialWorkerResult : completeWorkerResult;
  return build("editorial_images", started, ctx.deadline, {
    recordsProcessed: totalCompleted,
    recordsSkipped: totalSkipped + totalFailed,
    remainingQueue: remaining,
    partial,
    extra: {
      processed: totalProcessed,
      completed: totalCompleted,
      failed: totalFailed,
      retried: totalRetried,
      released,
      pending: remaining,
      loops,
      errors: errors.slice(0, 5),
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
