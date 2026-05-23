/**
 * Queue workers — ingest, AI, editorial, images
 */

import { INFRA_CONFIG } from "@/lib/infrastructure/config";
import { logIngestionAnalytics } from "@/lib/infrastructure/analytics/ingestion";
import { revalidateNewsroomCaches } from "@/lib/infrastructure/cache/isr";
import { processAiQueueBatch } from "@/lib/news/ai/process";
import { countPendingAiQueue } from "@/lib/news/ai/queue";
import { generateEditorialsFromEvents } from "@/lib/news/ai/generate-article";
import {
  countPendingEditorialImages,
  processEditorialImageQueue,
} from "@/lib/news/ai/generate-editorial-image";
import { runScalableIngestion } from "@/lib/news/pipeline/scalable-ingest";
import type { QueueWorker, WorkerContext, WorkerResult } from "@/lib/infrastructure/workers/types";

async function runIngestWorker(ctx: WorkerContext): Promise<WorkerResult> {
  const started = Date.now();
  if (ctx.deadline.shouldStop()) {
    return {
      worker: "ingest",
      ok: false,
      durationMs: 0,
      skipped: true,
      error: "deadline_precheck",
    };
  }

  const result = await runScalableIngestion(ctx.deadline);

  return {
    worker: "ingest",
    ok: result.ok,
    durationMs: Date.now() - started,
    metadata: {
      inserted: result.inserted,
      signalsInserted: result.signalsInserted,
      totalFetched: result.totalFetched,
      queuedForAI: result.queuedForAI,
      timedOutSafely: result.timedOutSafely,
      completedProviders: result.completedProviders,
      logId: result.logId,
    },
  };
}

async function runAiWorker(ctx: WorkerContext): Promise<WorkerResult> {
  const started = Date.now();
  if (!process.env.OPENAI_API_KEY?.trim()) {
    return {
      worker: "ai_enrich",
      ok: true,
      durationMs: 0,
      skipped: true,
      metadata: { message: "OPENAI_API_KEY not set" },
    };
  }

  if (ctx.deadline.shouldStop()) {
    return {
      worker: "ai_enrich",
      ok: false,
      durationMs: 0,
      skipped: true,
      error: "deadline_precheck",
    };
  }

  const batch = INFRA_CONFIG.aiQueueBatch;
  const result = await processAiQueueBatch(batch);
  const pending = await countPendingAiQueue();

  return {
    worker: "ai_enrich",
    ok: true,
    durationMs: Date.now() - started,
    metadata: {
      processed: result.processed,
      skipped: result.skipped,
      pending,
      errors: result.errors.slice(0, 5),
    },
  };
}

async function runEditorialWorker(ctx: WorkerContext): Promise<WorkerResult> {
  const started = Date.now();
  if (!process.env.OPENAI_API_KEY?.trim()) {
    return {
      worker: "editorial_generate",
      ok: true,
      durationMs: 0,
      skipped: true,
    };
  }

  if (ctx.deadline.shouldStop()) {
    return {
      worker: "editorial_generate",
      ok: false,
      durationMs: 0,
      skipped: true,
      error: "deadline_precheck",
    };
  }

  const result = await generateEditorialsFromEvents({
    limit: INFRA_CONFIG.editorialBatchLimit,
  });

  if (result.published > 0) {
    await revalidateNewsroomCaches({ publishedStories: result.published });
  }

  return {
    worker: "editorial_generate",
    ok: result.published > 0 || result.generated > 0,
    durationMs: Date.now() - started,
    metadata: {
      published: result.published,
      rejected: result.rejected,
      generated: result.generated,
      avgConfidence: result.avgConfidence,
      concurrency: INFRA_CONFIG.editorialConcurrency,
    },
  };
}

async function runImagesWorker(ctx: WorkerContext): Promise<WorkerResult> {
  const started = Date.now();
  if (ctx.deadline.shouldStop()) {
    return {
      worker: "editorial_images",
      ok: false,
      durationMs: 0,
      skipped: true,
      error: "deadline_precheck",
    };
  }

  const pending = await countPendingEditorialImages();
  if (!pending) {
    return {
      worker: "editorial_images",
      ok: true,
      durationMs: Date.now() - started,
      skipped: true,
      metadata: { pending: 0 },
    };
  }

  const result = await processEditorialImageQueue(INFRA_CONFIG.imageQueueBatch);

  return {
    worker: "editorial_images",
    ok: result.completed > 0 || result.processed === 0,
    durationMs: Date.now() - started,
    metadata: {
      processed: result.processed,
      completed: result.completed,
      failed: result.failed,
      pending: await countPendingEditorialImages(),
    },
  };
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

  logIngestionAnalytics({ event: "worker_start", worker: workerId });

  try {
    const result = await worker.run(ctx);
    logIngestionAnalytics({
      event: "worker_complete",
      worker: workerId,
      durationMs: result.durationMs,
      metadata: result.metadata,
    });
    return result;
  } catch (err) {
    const msg = err instanceof Error ? err.message : "worker_failed";
    logIngestionAnalytics({
      event: "worker_complete",
      worker: workerId,
      error: msg,
    });
    return {
      worker: workerId,
      ok: false,
      durationMs: 0,
      error: msg,
    };
  }
}
