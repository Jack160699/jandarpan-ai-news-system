/**
 * Intelligence & async job workers — embeddings, snapshots, job drain, event bus
 */

import { deliverPendingEvents } from "@/lib/infrastructure/events/event-bus";
import { JOB_HANDLERS } from "@/lib/infrastructure/jobs/handlers";
import { processJobBatch, countPendingJobs } from "@/lib/infrastructure/jobs/queue";
import { INFRA_CONFIG } from "@/lib/infrastructure/config";
import type { QueueWorker, WorkerContext, WorkerResult } from "@/lib/infrastructure/workers/types";

async function runJobProcessor(ctx: WorkerContext): Promise<WorkerResult> {
  const started = Date.now();
  if (ctx.deadline.shouldStop()) {
    return {
      worker: "job_processor",
      ok: false,
      durationMs: 0,
      skipped: true,
      error: "deadline_precheck",
    };
  }

  const eventDelivery = await deliverPendingEvents(15);
  const batch = await processJobBatch(JOB_HANDLERS, {
    limit: INFRA_CONFIG.workerJobBatch,
    workerId: "job_processor",
  });
  const pending = await countPendingJobs();

  return {
    worker: "job_processor",
    ok: batch.completed > 0 || eventDelivery.delivered > 0 || pending === 0,
    durationMs: Date.now() - started,
    metadata: {
      ...batch,
      eventsDelivered: eventDelivery.delivered,
      eventsFailed: eventDelivery.failed,
      pending,
    },
  };
}

async function runIntelligenceEmbed(ctx: WorkerContext): Promise<WorkerResult> {
  const started = Date.now();
  if (!process.env.OPENAI_API_KEY?.trim()) {
    return {
      worker: "intelligence_embed",
      ok: true,
      durationMs: 0,
      skipped: true,
      metadata: { message: "OPENAI_API_KEY not set" },
    };
  }

  const batch = await processJobBatch(JOB_HANDLERS, {
    limit: INFRA_CONFIG.workerJobBatch,
    jobTypes: ["embed_signals", "embed_articles"],
    workerId: "intelligence_embed",
  });

  return {
    worker: "intelligence_embed",
    ok: batch.completed > 0 || batch.processed === 0,
    durationMs: Date.now() - started,
    metadata: batch,
  };
}

async function runIntelligenceSnapshot(ctx: WorkerContext): Promise<WorkerResult> {
  const started = Date.now();
  const batch = await processJobBatch(JOB_HANDLERS, {
    limit: 2,
    jobTypes: [
      "intelligence_cluster",
      "intelligence_snapshot",
      "intelligence_summary",
      "seo_analysis",
      "translation_batch",
      "translate_article",
    ],
    workerId: "intelligence_snapshot",
  });

  return {
    worker: "intelligence_snapshot",
    ok: batch.completed > 0 || batch.processed === 0,
    durationMs: Date.now() - started,
    metadata: batch,
  };
}

async function runAnalyticsWorker(ctx: WorkerContext): Promise<WorkerResult> {
  const started = Date.now();
  const batch = await processJobBatch(JOB_HANDLERS, {
    limit: 3,
    jobTypes: ["analytics_aggregate"],
    workerId: "analytics_aggregate",
  });

  return {
    worker: "analytics_aggregate",
    ok: batch.completed > 0 || batch.processed === 0,
    durationMs: Date.now() - started,
    metadata: batch,
  };
}

async function runDamAnalyzeWorker(ctx: WorkerContext): Promise<WorkerResult> {
  const started = Date.now();
  const batch = await processJobBatch(JOB_HANDLERS, {
    limit: INFRA_CONFIG.damAnalyzeBatch,
    jobTypes: ["dam_analyze"],
    workerId: "dam_analyze",
  });

  return {
    worker: "dam_analyze",
    ok: batch.completed > 0 || batch.processed === 0,
    durationMs: Date.now() - started,
    metadata: batch,
  };
}

async function runEventClusterWorker(ctx: WorkerContext): Promise<WorkerResult> {
  const started = Date.now();
  const batch = await processJobBatch(JOB_HANDLERS, {
    limit: 1,
    jobTypes: ["event_cluster"],
    workerId: "event_cluster",
  });

  return {
    worker: "event_cluster",
    ok: batch.completed > 0 || batch.processed === 0,
    durationMs: Date.now() - started,
    metadata: batch,
  };
}

export const INTELLIGENCE_WORKERS: QueueWorker[] = [
  { id: "job_processor", label: "Job queue + event bus", run: runJobProcessor },
  {
    id: "intelligence_embed",
    label: "Vector embeddings",
    run: runIntelligenceEmbed,
  },
  {
    id: "intelligence_snapshot",
    label: "Intelligence snapshot precompute",
    run: runIntelligenceSnapshot,
  },
  {
    id: "analytics_aggregate",
    label: "Analytics rollup snapshots",
    run: runAnalyticsWorker,
  },
  { id: "dam_analyze", label: "DAM vision AI", run: runDamAnalyzeWorker },
  {
    id: "event_cluster",
    label: "Signal→event clustering",
    run: runEventClusterWorker,
  },
];
