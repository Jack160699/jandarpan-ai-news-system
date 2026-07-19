/**
 * Dedicated editorial-generation cron.
 *
 * Drains worker_jobs(editorial_generate) on its own schedule and budget —
 * independent of the shared orchestrator (~110s) that previously starved
 * generation behind embed/snapshot/analytics work.
 *
 * Cadence: vercel.json `5,20,35,50 * * * *` (every 15 minutes, offset from
 * fetch-news and orchestrate). Overlap lock prevents concurrent runs.
 */

import { NextResponse } from "next/server";
import { verifyCronRequest } from "@/lib/infrastructure/auth/cron-auth";
import { cronAuthFailureResponse } from "@/lib/infrastructure/auth/cron-response";
import { noStoreHeaders } from "@/lib/infrastructure/cache/edge";
import { runWorkerEndpoint } from "@/lib/infrastructure/workers/run-guard";
import { runQueueWorker } from "@/lib/infrastructure/workers/registry";
import {
  GENERATION_LANE_TARGETS,
  getEditorialGenerateQueueMetrics,
} from "@/lib/infrastructure/workers/editorial-generate-observability";
import { createExecutionDeadline } from "@/lib/serverless/deadline";
import { recordCronRun } from "@/lib/observability/cron-monitor";
import { isSupabaseConfigured } from "@/lib/supabase";
import { pipelineLog } from "@/lib/observability/production-log";

export const runtime = "nodejs";
export const maxDuration = 120;
export const dynamic = "force-dynamic";

const CRON_JOB_ID = "editorial-generate";

export async function GET(request: Request) {
  return handleEditorialGenerate(request);
}

export async function POST(request: Request) {
  return handleEditorialGenerate(request);
}

async function handleEditorialGenerate(request: Request) {
  const startedAt = Date.now();
  const auth = await verifyCronRequest(request, { capability: "pipeline" });
  if (!auth.authorized) {
    return cronAuthFailureResponse(auth);
  }

  pipelineLog("[cron_triggered]", {
    job: CRON_JOB_ID,
    path: new URL(request.url).pathname,
    ts: new Date().toISOString(),
  });

  if (!isSupabaseConfigured()) {
    await recordCronRun({
      job: CRON_JOB_ID,
      ok: false,
      startedAt: new Date(startedAt).toISOString(),
      durationMs: Date.now() - startedAt,
      error: "supabase_not_configured",
    });
    return NextResponse.json(
      { ok: false, error: "supabase_not_configured" },
      { status: 500, headers: noStoreHeaders() }
    );
  }

  const lockResult = await runWorkerEndpoint(
    CRON_JOB_ID,
    GENERATION_LANE_TARGETS.lockWindowSec,
    async () => {
      const deadline = createExecutionDeadline(GENERATION_LANE_TARGETS.budgetMs);
      const result = await runQueueWorker("editorial_generate", {
        deadline,
        requestUrl: request.url,
        editorialGenerateTrigger: "dedicated_lane",
      });

      const meta = (result.metadata ?? {}) as Record<string, unknown>;
      const processed = Number(meta.processed ?? meta.recordsProcessed ?? 0);
      const failed = Number(meta.failed ?? 0);
      const status = String(meta.status ?? (result.ok ? "success" : "failed"));
      const degraded =
        Boolean(meta.degraded) ||
        Boolean(result.skipped) ||
        status === "degraded" ||
        Boolean(meta.partial);

      return {
        ok: result.ok && status !== "failed",
        degraded,
        processed,
        failed: status === "failed" ? Math.max(1, failed) : failed,
        details: {
          result,
          timedOutSafely: deadline.timedOutSafely,
          deadlineRemainingMs: deadline.remainingMs(),
          continuationRequired: Boolean(meta.continuationRequired),
          queueDepth: meta.queueDepth,
          oldestPendingAgeMs: meta.oldestPendingAgeMs,
          incidents: meta.incidents,
          generatedArticleIds: meta.generatedArticleIds,
          skippedReasons: meta.skippedReasons,
        },
      };
    }
  );

  if (lockResult.skipped && lockResult.reason === "overlap_lock") {
    await recordCronRun({
      job: CRON_JOB_ID,
      ok: true,
      startedAt: new Date(startedAt).toISOString(),
      durationMs: Date.now() - startedAt,
      degraded: true,
    });
    return NextResponse.json(
      {
        ok: true,
        skipped: true,
        reason: "overlap_lock",
        durationMs: Date.now() - startedAt,
      },
      { headers: noStoreHeaders() }
    );
  }

  const durationMs = lockResult.duration_ms;
  const degraded = Boolean(lockResult.degraded);
  const queue = await getEditorialGenerateQueueMetrics().catch(() => null);

  await recordCronRun({
    job: CRON_JOB_ID,
    ok: lockResult.ok,
    startedAt: new Date(startedAt).toISOString(),
    durationMs,
    degraded,
    entityCount: lockResult.processed,
    ...(lockResult.ok
      ? {}
      : { error: lockResult.reason ?? "editorial_generate_failed" }),
    metadata: {
      continuationRequired: lockResult.details?.continuationRequired,
      queueDepth: queue?.pending ?? lockResult.details?.queueDepth,
      oldestPendingAgeMs:
        queue?.oldestPendingAgeMs ?? lockResult.details?.oldestPendingAgeMs,
    },
  });

  const statusCode = lockResult.ok ? 200 : 500;
  return NextResponse.json(
    {
      ok: lockResult.ok,
      degraded,
      processed: lockResult.processed,
      failed: lockResult.failed,
      durationMs,
      queue,
      details: lockResult.details,
      reason: lockResult.reason,
    },
    { status: statusCode, headers: noStoreHeaders() }
  );
}
