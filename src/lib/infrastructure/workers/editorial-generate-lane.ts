/**
 * Dedicated editorial generation lane — drains worker_jobs(editorial_generate)
 * on an independent schedule and budget from orchestrate/job_processor.
 */

import { INFRA_CONFIG } from "@/lib/infrastructure/config";
import { JOB_HANDLERS } from "@/lib/infrastructure/jobs/handlers";
import { processJobBatch } from "@/lib/infrastructure/jobs/queue";
import {
  completeWorkerResult,
  partialWorkerResult,
  shouldSkipForDeadline,
  skippedWorkerResult,
} from "@/lib/infrastructure/workers/deadline-aware";
import {
  evaluateGenerationLaneIncidents,
  GENERATION_LANE_TARGETS,
  getEditorialGenerateQueueMetrics,
  type EditorialGenerateLaneOutcome,
  type EditorialGenerateQueueMetrics,
  type GenerationLaneIncident,
} from "@/lib/infrastructure/workers/editorial-generate-observability";
import type { WorkerContext, WorkerResult } from "@/lib/infrastructure/workers/types";
import { createAdminClient } from "@/lib/supabase";

export type LaneBatchSummary = {
  processed: number;
  completed: number;
  failed: number;
  dead: number;
  partial?: boolean;
  released?: number;
};

export function classifyLaneOutcome(input: {
  batch: LaneBatchSummary;
  incidents: GenerationLaneIncident[];
  skipped?: boolean;
  reason?: string;
}): EditorialGenerateLaneOutcome {
  if (input.skipped && input.reason && input.reason !== "queue_empty") {
    return "degraded";
  }

  // Hard failure only when this invocation's claimed work produced no success.
  if (input.batch.dead > 0 && input.batch.completed === 0) return "failed";
  if (
    input.batch.processed > 0 &&
    input.batch.failed > 0 &&
    input.batch.completed === 0
  ) {
    return "failed";
  }

  // Queue-age / dead-letter incidents degrade the lane; they must not flip a
  // useful batch (completed > 0) into a hard cron failure.
  if (
    input.batch.partial ||
    input.batch.failed > 0 ||
    input.batch.dead > 0 ||
    input.incidents.length > 0
  ) {
    return "degraded";
  }

  return "success";
}

async function collectGeneratedArticleIds(
  sinceIso: string
): Promise<string[]> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("worker_jobs")
    .select("result")
    .eq("job_type", "editorial_generate")
    .eq("status", "completed")
    .gte("completed_at", sinceIso)
    .order("completed_at", { ascending: false })
    .limit(GENERATION_LANE_TARGETS.batchLimit);

  const ids: string[] = [];
  for (const row of data ?? []) {
    const result = row.result as Record<string, unknown> | null;
    const fromList = result?.generatedArticleIds;
    if (Array.isArray(fromList)) {
      for (const id of fromList) {
        if (typeof id === "string" && id.trim()) ids.push(id);
      }
      continue;
    }
    const storyId = result?.topStory;
    if (
      storyId &&
      typeof storyId === "object" &&
      typeof (storyId as { storyId?: unknown }).storyId === "string"
    ) {
      ids.push((storyId as { storyId: string }).storyId);
    }
  }

  return [...new Set(ids)];
}

export async function runEditorialGenerateLane(
  ctx: WorkerContext
): Promise<WorkerResult> {
  const started = Date.now();
  const startedIso = new Date(started).toISOString();

  if (process.env.NEWSROOM_GENERATE_ARTICLES !== "true") {
    return skippedWorkerResult(
      "editorial_generate",
      started,
      ctx.deadline,
      "not_enabled"
    );
  }

  if (!process.env.OPENAI_API_KEY?.trim()) {
    return skippedWorkerResult(
      "editorial_generate",
      started,
      ctx.deadline,
      "no_openai_key"
    );
  }

  if (shouldSkipForDeadline(ctx.deadline, INFRA_CONFIG.workerDeadlineReserveMs)) {
    return skippedWorkerResult(
      "editorial_generate",
      started,
      ctx.deadline,
      "deadline_precheck"
    );
  }

  let metrics: EditorialGenerateQueueMetrics;
  try {
    metrics = await getEditorialGenerateQueueMetrics();
  } catch {
    metrics = {
      pending: 0,
      claimed: 0,
      dead: 0,
      oldestPendingAgeMs: null,
      lastSuccessAt: null,
      lastSuccessAgeMs: null,
      recentFailures: 0,
    };
  }

  const incidents = evaluateGenerationLaneIncidents(metrics);

  if (metrics.pending === 0 && metrics.claimed === 0) {
    const outcome = classifyLaneOutcome({
      batch: {
        processed: 0,
        completed: 0,
        failed: 0,
        dead: 0,
      },
      incidents,
      skipped: true,
      reason: "queue_empty",
    });

    return completeWorkerResult("editorial_generate", started, ctx.deadline, {
      recordsProcessed: 0,
      recordsSkipped: 0,
      remainingQueue: 0,
      partial: false,
      extra: {
        status: outcome,
        queueDepth: 0,
        oldestPendingAgeMs: metrics.oldestPendingAgeMs,
        incidents,
        generatedArticleIds: [],
        continuationRequired: false,
      },
    });
  }

  const batch = await processJobBatch(JOB_HANDLERS, {
    jobTypes: ["editorial_generate"],
    limit: GENERATION_LANE_TARGETS.batchLimit,
    workerId: "editorial_generate",
    deadline: ctx.deadline,
  });

  const remainingQueue = Math.max(
    0,
    metrics.pending + metrics.claimed - batch.completed
  );
  const generatedArticleIds = await collectGeneratedArticleIds(startedIso);
  const outcome = classifyLaneOutcome({ batch, incidents });
  const continuationRequired = Boolean(batch.partial) || remainingQueue > 0;

  if (outcome === "failed") {
    return {
      worker: "editorial_generate",
      ok: false,
      durationMs: Date.now() - started,
      error: "editorial_generate_batch_failed",
      metadata: {
        status: outcome,
        degraded: false,
        ...batch,
        queueDepth: remainingQueue,
        oldestPendingAgeMs: metrics.oldestPendingAgeMs,
        incidents,
        generatedArticleIds,
        continuationRequired,
        processed: batch.processed,
        failed: batch.failed,
      },
    };
  }

  const build =
    batch.partial || outcome === "degraded"
      ? partialWorkerResult
      : completeWorkerResult;

  return build("editorial_generate", started, ctx.deadline, {
    recordsProcessed: batch.completed,
    recordsSkipped: batch.failed + batch.dead,
    remainingQueue,
    partial: batch.partial ?? false,
    extra: {
      ...batch,
      status: outcome,
      degraded: outcome !== "success",
      queueDepth: remainingQueue,
      oldestPendingAgeMs: metrics.oldestPendingAgeMs,
      incidents,
      generatedArticleIds,
      continuationRequired,
      processed: batch.processed,
      failed: batch.failed,
    },
  });
}
