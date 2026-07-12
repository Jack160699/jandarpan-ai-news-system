/**
 * Intelligence & async job workers — embeddings, snapshots, job drain, event bus
 */

import { deliverPendingEvents } from "@/lib/infrastructure/events/event-bus";
import { JOB_HANDLERS } from "@/lib/infrastructure/jobs/handlers";
import { processJobBatch, countPendingJobs } from "@/lib/infrastructure/jobs/queue";
import { INFRA_CONFIG } from "@/lib/infrastructure/config";
import { buildQueueHealthSnapshot } from "@/lib/infrastructure/queue/health-manager";
import {
  completeWorkerResult,
  partialWorkerResult,
  shouldSkipForDeadline,
  skippedWorkerResult,
} from "@/lib/infrastructure/workers/deadline-aware";
import type { QueueWorker, WorkerContext, WorkerResult } from "@/lib/infrastructure/workers/types";

async function runJobProcessor(ctx: WorkerContext): Promise<WorkerResult> {
  const started = Date.now();
  if (shouldSkipForDeadline(ctx.deadline, INFRA_CONFIG.workerDeadlineReserveMs)) {
    const pending = await countPendingJobs();
    return skippedWorkerResult("job_processor", started, ctx.deadline, "deadline_precheck", pending);
  }

  const health = await buildQueueHealthSnapshot().catch(() => null);

  const eventDelivery = await deliverPendingEvents(15);
  const batch = await processJobBatch(JOB_HANDLERS, {
    limit: INFRA_CONFIG.workerJobBatch,
    workerId: "job_processor",
    deadline: ctx.deadline,
    oldestFirst: health?.oldestFirst ?? false,
  });
  const pending = await countPendingJobs();

  const build = batch.partial ? partialWorkerResult : completeWorkerResult;
  return build("job_processor", started, ctx.deadline, {
    recordsProcessed: batch.completed + eventDelivery.delivered,
    recordsSkipped: batch.failed,
    remainingQueue: pending,
    partial: batch.partial ?? false,
    extra: {
      ...batch,
      eventsDelivered: eventDelivery.delivered,
      eventsFailed: eventDelivery.failed,
      pending,
      ...(batch.released != null ? { released: batch.released } : {}),
    },
  });
}

async function runIntelligenceEmbed(ctx: WorkerContext): Promise<WorkerResult> {
  const started = Date.now();
  if (!process.env.OPENAI_API_KEY?.trim()) {
    return skippedWorkerResult("intelligence_embed", started, ctx.deadline, "no_openai_key");
  }

  if (shouldSkipForDeadline(ctx.deadline, INFRA_CONFIG.workerDeadlineReserveMs)) {
    return skippedWorkerResult("intelligence_embed", started, ctx.deadline, "deadline_precheck");
  }

  const batch = await processJobBatch(JOB_HANDLERS, {
    limit: INFRA_CONFIG.workerJobBatch,
    jobTypes: ["embed_signals", "embed_articles"],
    workerId: "intelligence_embed",
    deadline: ctx.deadline,
  });

  const build = batch.partial ? partialWorkerResult : completeWorkerResult;
  return build("intelligence_embed", started, ctx.deadline, {
    recordsProcessed: batch.completed,
    recordsSkipped: batch.failed,
    partial: batch.partial ?? false,
    extra: { ...batch, ...(batch.released != null ? { released: batch.released } : {}) },
  });
}

async function runIntelligenceSnapshot(ctx: WorkerContext): Promise<WorkerResult> {
  const started = Date.now();
  if (shouldSkipForDeadline(ctx.deadline, INFRA_CONFIG.workerDeadlineReserveMs)) {
    return skippedWorkerResult("intelligence_snapshot", started, ctx.deadline, "deadline_precheck");
  }

  const batch = await processJobBatch(JOB_HANDLERS, {
    limit: 2,
    jobTypes: [
      "intelligence_cluster",
      "intelligence_snapshot",
      "intelligence_summary",
      "seo_analysis",
    ],
    workerId: "intelligence_snapshot",
    deadline: ctx.deadline,
  });

  const build = batch.partial ? partialWorkerResult : completeWorkerResult;
  return build("intelligence_snapshot", started, ctx.deadline, {
    recordsProcessed: batch.completed,
    recordsSkipped: batch.failed,
    partial: batch.partial ?? false,
    extra: { ...batch, ...(batch.released != null ? { released: batch.released } : {}) },
  });
}

async function runAnalyticsWorker(ctx: WorkerContext): Promise<WorkerResult> {
  const started = Date.now();
  if (shouldSkipForDeadline(ctx.deadline, INFRA_CONFIG.workerDeadlineReserveMs)) {
    return skippedWorkerResult("analytics_aggregate", started, ctx.deadline, "deadline_precheck");
  }

  const batch = await processJobBatch(JOB_HANDLERS, {
    limit: 3,
    jobTypes: ["analytics_aggregate"],
    workerId: "analytics_aggregate",
    deadline: ctx.deadline,
  });

  const build = batch.partial ? partialWorkerResult : completeWorkerResult;
  return build("analytics_aggregate", started, ctx.deadline, {
    recordsProcessed: batch.completed,
    recordsSkipped: batch.failed,
    partial: batch.partial ?? false,
    extra: { ...batch, ...(batch.released != null ? { released: batch.released } : {}) },
  });
}

async function runDamAnalyzeWorker(ctx: WorkerContext): Promise<WorkerResult> {
  const started = Date.now();
  if (shouldSkipForDeadline(ctx.deadline, INFRA_CONFIG.workerDeadlineReserveMs)) {
    return skippedWorkerResult("dam_analyze", started, ctx.deadline, "deadline_precheck");
  }

  const batch = await processJobBatch(JOB_HANDLERS, {
    limit: INFRA_CONFIG.damAnalyzeBatch,
    jobTypes: ["dam_analyze"],
    workerId: "dam_analyze",
    deadline: ctx.deadline,
  });

  const build = batch.partial ? partialWorkerResult : completeWorkerResult;
  return build("dam_analyze", started, ctx.deadline, {
    recordsProcessed: batch.completed,
    recordsSkipped: batch.failed,
    partial: batch.partial ?? false,
    extra: batch,
  });
}

async function runEventClusterWorker(ctx: WorkerContext): Promise<WorkerResult> {
  const started = Date.now();
  if (shouldSkipForDeadline(ctx.deadline, INFRA_CONFIG.workerDeadlineReserveMs)) {
    return skippedWorkerResult("event_cluster", started, ctx.deadline, "deadline_precheck");
  }

  const batch = await processJobBatch(JOB_HANDLERS, {
    limit: 1,
    jobTypes: ["event_cluster"],
    workerId: "event_cluster",
    deadline: ctx.deadline,
  });

  const build = batch.partial ? partialWorkerResult : completeWorkerResult;
  return build("event_cluster", started, ctx.deadline, {
    recordsProcessed: batch.completed,
    recordsSkipped: batch.failed,
    partial: batch.partial ?? false,
    extra: batch,
  });
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
