/**
 * Dedicated editorial generation lane — drains worker_jobs(editorial_generate)
 * on an independent schedule and budget from orchestrate/job_processor.
 */

import { INFRA_CONFIG } from "@/lib/infrastructure/config";
import { JOB_HANDLERS } from "@/lib/infrastructure/jobs/handlers";
import { processJobBatch } from "@/lib/infrastructure/jobs/queue";
import { isAnyChatProviderConfigured } from "@/lib/ai/providers/chat";
import { generateEditorialsFromEvents } from "@/lib/news/ai/generate-article";
import { EDITORIAL_LIMITS } from "@/lib/newsroom/editorial-capacity";
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

  if (!isAnyChatProviderConfigured()) {
    return skippedWorkerResult(
      "editorial_generate",
      started,
      ctx.deadline,
      "no_ai_provider_configured"
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

  // Bounded iterative producer: processes safe sequential batches until target
  // published count is reached or deadline runs low (50s reserve for graceful exit).
  const batchSize = Math.max(
    1,
    Math.min(6, Number(process.env.EDITORIAL_BATCH_LIMIT) || 4)
  );
  const targetPublished = Math.max(
    batchSize,
    Number(process.env.EDITORIAL_TARGET_PUBLISHED) || 12
  );
  const maxBatches = Math.max(1, Math.min(8, Math.ceil(targetPublished / batchSize)));

  let totalGenerated = 0;
  let totalPublished = 0;
  let totalRejected = 0;
  let totalSkipped = 0;
  let totalUpdates = 0;
  const allGeneratedArticleIds: string[] = [];
  const allErrors: string[] = [];
  const combinedSkipReasonCounts: Record<string, number> = {};
  let lastCandidatePool: any = null;

  for (let batchIndex = 0; batchIndex < maxBatches; batchIndex++) {
    // Only continue into subsequent batches if at least 50s remains before serverless deadline
    if (batchIndex > 0 && shouldSkipForDeadline(ctx.deadline, 50_000)) {
      break;
    }
    if (totalPublished >= targetPublished) {
      break;
    }

    const direct = await generateEditorialsFromEvents({
      limit: batchSize,
    });

    if (!direct) break;

    totalGenerated += direct.generated ?? 0;
    totalPublished += direct.published ?? 0;
    totalRejected += direct.rejected ?? 0;
    totalSkipped += direct.skipped ?? 0;
    totalUpdates += direct.updates ?? 0;

    if (direct.topStory?.storyId) {
      allGeneratedArticleIds.push(direct.topStory.storyId);
    }
    for (const r of direct.results ?? []) {
      if (r.articleId) {
        allGeneratedArticleIds.push(r.articleId);
      }
    }
    if (direct.errors?.length) {
      allErrors.push(...direct.errors);
    }
    if (direct.skipReasonCounts) {
      for (const [k, v] of Object.entries(direct.skipReasonCounts)) {
        combinedSkipReasonCounts[k] = (combinedSkipReasonCounts[k] ?? 0) + v;
      }
    }
    if (direct.candidatePool) {
      lastCandidatePool = direct.candidatePool;
    }

    // If no stories were generated or published in this batch, stop iterating
    if (
      (direct.generated ?? 0) === 0 &&
      (direct.published ?? 0) === 0 &&
      (direct.skipped ?? 0) > 0 &&
      (direct.rejected ?? 0) === 0
    ) {
      break;
    }
  }

  const uniqueArticleIds = [...new Set(allGeneratedArticleIds)];
  const madeProgress = totalGenerated > 0 || totalPublished > 0;

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

  const outcome = classifyLaneOutcome({
    batch: {
      processed: totalGenerated + totalSkipped + totalUpdates,
      completed: totalGenerated,
      failed: totalRejected,
      dead: 0,
    },
    incidents,
    skipped: !madeProgress,
    reason: madeProgress ? undefined : "no_eligible_candidates",
  });

  return completeWorkerResult("editorial_generate", started, ctx.deadline, {
    recordsProcessed: totalPublished,
    recordsSkipped: totalRejected + totalSkipped,
    remainingQueue: 0,
    partial: false,
    extra: {
      status: outcome,
      queueDepth: 0,
      oldestPendingAgeMs: metrics.oldestPendingAgeMs,
      incidents,
      generatedArticleIds: uniqueArticleIds,
      continuationRequired: false,
      directGeneration: true,
      generated: totalGenerated,
      published: totalPublished,
      rejected: totalRejected,
      skipped: totalSkipped,
      errors: allErrors.slice(0, 10),
      skipReasonCounts: combinedSkipReasonCounts,
      candidatePool: lastCandidatePool,
    },
  });
}
