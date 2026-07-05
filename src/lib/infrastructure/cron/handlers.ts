/**
 * Shared cron route handlers — GET/POST safe (no request body required)
 */

import { NextResponse } from "next/server";
import { verifyCronRequest } from "@/lib/infrastructure/auth/cron-auth";
import { cronAuthFailureResponse } from "@/lib/infrastructure/auth/cron-response";
import { noStoreHeaders } from "@/lib/infrastructure/cache/edge";
import { listWorkers } from "@/lib/infrastructure/cron/orchestrator";
import {
  CRON_WORKER_IDS,
  CRON_WORKER_ALIASES,
  resolveCronWorkerId,
} from "@/lib/infrastructure/cron/worker-aliases";
import { INFRA_CONFIG } from "@/lib/infrastructure/config";
import { deliverPendingEvents } from "@/lib/infrastructure/events/event-bus";
import { JOB_HANDLERS } from "@/lib/infrastructure/jobs/handlers";
import {
  getQueueStats,
  getWorkerHealth,
} from "@/lib/infrastructure/jobs/monitor";
import { processJobBatch } from "@/lib/infrastructure/jobs/queue";
import { runQueueWorker } from "@/lib/infrastructure/workers/registry";
import {
  isCacheDegraded,
  runWorkerEndpoint,
  type WorkerRunPayload,
} from "@/lib/infrastructure/workers/run-guard";
import type { WorkerId } from "@/lib/infrastructure/workers/types";
import { recordCronRun } from "@/lib/observability/cron-monitor";
import { createExecutionDeadline } from "@/lib/serverless/deadline";
import { isSupabaseConfigured } from "@/lib/supabase";

export type CronExecutionResponse = {
  ok: boolean;
  worker: string;
  processed: number;
  failed: number;
  duration_ms: number;
  skipped?: boolean;
  reason?: string;
  details?: Record<string, unknown>;
};

const LOCK_WINDOWS: Partial<Record<WorkerId, number>> = {
  intelligence_embed: 1140,
  intelligence_snapshot: 840,
  job_processor: 540,
};

const CRITICAL_DEAD_LETTERS = Number(process.env.WORKER_CRITICAL_DLQ) || 50;
const CRITICAL_CLAIMED_STALE = Number(process.env.WORKER_CRITICAL_CLAIMED) || 15;
const CRITICAL_SUCCESS_RATE = Number(process.env.WORKER_CRITICAL_SUCCESS_RATE) || 0.35;

function toCronResponse(
  worker: string,
  payload: WorkerRunPayload,
  extra?: Record<string, unknown>
): CronExecutionResponse {
  return {
    ok: payload.ok,
    worker,
    processed: payload.processed,
    failed: payload.failed,
    duration_ms: payload.duration_ms,
    ...(payload.skipped ? { skipped: payload.skipped } : {}),
    ...(payload.reason ? { reason: payload.reason } : {}),
    ...(payload.details || extra
      ? { details: { ...payload.details, ...extra } }
      : {}),
  };
}

function jsonCron(
  body: CronExecutionResponse,
  status = 200
): NextResponse {
  return NextResponse.json(body, { status, headers: noStoreHeaders() });
}

export async function handleCronJobs(request: Request): Promise<NextResponse> {
  const auth = await verifyCronRequest(request);
  if (!auth.authorized) {
    return cronAuthFailureResponse(auth);
  }

  if (!isSupabaseConfigured()) {
    return jsonCron(
      {
        ok: false,
        worker: "cron_jobs",
        processed: 0,
        failed: 0,
        duration_ms: 0,
        reason: "supabase_not_configured",
      },
      500
    );
  }

  const payload = await runWorkerEndpoint("cron_jobs", 540, async () => {
    const events = await deliverPendingEvents(20);
    const batch = await processJobBatch(JOB_HANDLERS, {
      limit: INFRA_CONFIG.workerJobBatch,
      workerId: "cron_jobs",
    });
    const stats = await getQueueStats();

    return {
      ok: batch.failed === 0 && batch.dead === 0,
      processed: batch.processed,
      failed: batch.failed + batch.dead,
      details: { events, batch, stats },
    };
  });

  return jsonCron(toCronResponse("cron_jobs", payload));
}

export async function handleCronWorker(
  request: Request,
  workerSlug: string
): Promise<NextResponse> {
  const startedAt = Date.now();
  const auth = await verifyCronRequest(request);
  if (!auth.authorized) {
    return cronAuthFailureResponse(auth);
  }

  const workerId = resolveCronWorkerId(workerSlug);
  if (!workerId) {
    return jsonCron(
      {
        ok: false,
        worker: workerSlug,
        processed: 0,
        failed: 0,
        duration_ms: 0,
        reason: "invalid_worker",
        details: { valid: CRON_WORKER_IDS, aliases: Object.keys(CRON_WORKER_ALIASES) },
      },
      400
    );
  }

  if (!isSupabaseConfigured()) {
    const durationMs = Date.now() - startedAt;
    await recordCronRun({
      job: workerId,
      ok: false,
      startedAt: new Date(startedAt).toISOString(),
      durationMs,
      error: "supabase_not_configured",
    });
    return jsonCron(
      {
        ok: false,
        worker: workerId,
        processed: 0,
        failed: 0,
        duration_ms: durationMs,
        reason: "supabase_not_configured",
      },
      500
    );
  }

  const lockSec = LOCK_WINDOWS[workerId] ?? 600;

  const payload = await runWorkerEndpoint(workerId, lockSec, async () => {
    const deadline = createExecutionDeadline(INFRA_CONFIG.ingestBudgetMs);
    const result = await runQueueWorker(workerId, {
      deadline,
      requestUrl: request.url,
    });

    const metadata = result.metadata as
      | { processed?: number; failed?: number; completed?: number }
      | undefined;

    const processed =
      metadata?.processed ??
      metadata?.completed ??
      (result.ok && !result.skipped ? 1 : 0);
    const failed =
      metadata?.failed ?? (result.ok || result.skipped ? 0 : 1);

    return {
      ok: result.ok,
      processed: Number(processed) || 0,
      failed: Number(failed) || 0,
      details: {
        result,
        timedOutSafely: deadline.timedOutSafely,
      },
    };
  });

  const workerResult = payload.details?.result as
    | { skipped?: boolean; ok?: boolean }
    | undefined;
  const degraded = Boolean(payload.skipped || workerResult?.skipped);

  await recordCronRun({
    job: workerId,
    ok: payload.ok,
    startedAt: new Date(startedAt).toISOString(),
    durationMs: payload.duration_ms,
    degraded,
    ...(payload.reason && !payload.ok ? { error: payload.reason } : {}),
  });

  return jsonCron(toCronResponse(workerId, payload));
}

function evaluateCriticalHealth(input: {
  queue: Awaited<ReturnType<typeof getQueueStats>>;
  health: Awaited<ReturnType<typeof getWorkerHealth>>;
}): { critical: boolean; reasons: string[] } {
  const reasons: string[] = [];

  if (input.queue.deadLetters >= CRITICAL_DEAD_LETTERS) {
    reasons.push(`dead_letters:${input.queue.deadLetters}`);
  }

  if (input.queue.staleClaimed >= CRITICAL_CLAIMED_STALE) {
    reasons.push(`stale_claimed:${input.queue.staleClaimed}`);
  }

  if (input.queue.eventBusPending >= 50) {
    reasons.push(`event_bus_backlog:${input.queue.eventBusPending}`);
  }

  for (const worker of input.health) {
    if (
      worker.runs24h >= 5 &&
      worker.successRate < CRITICAL_SUCCESS_RATE &&
      ["intelligence_embed", "intelligence_snapshot", "cron_jobs", "job_processor"].includes(
        worker.workerId
      )
    ) {
      reasons.push(`low_success:${worker.workerId}:${worker.successRate}`);
    }
  }

  return { critical: reasons.length > 0, reasons };
}

export async function handleCronHealth(request: Request): Promise<NextResponse> {
  const auth = await verifyCronRequest(request);
  if (!auth.authorized) {
    return cronAuthFailureResponse(auth);
  }

  const started = Date.now();
  const [stats, health] = await Promise.all([
    getQueueStats(),
    getWorkerHealth(24),
  ]);

  const evaluation = evaluateCriticalHealth({ queue: stats, health });
  const duration_ms = Date.now() - started;

  const body: CronExecutionResponse = {
    ok: !evaluation.critical,
    worker: "health",
    processed: health.length,
    failed: evaluation.reasons.length,
    duration_ms,
    details: {
      critical: evaluation.critical,
      criticalReasons: evaluation.reasons,
      workers: listWorkers(),
      queue: stats,
      health,
      cacheDegraded: isCacheDegraded(),
      checkedAt: new Date().toISOString(),
    },
  };

  return jsonCron(body, evaluation.critical ? 503 : 200);
}

/** GET and POST both delegate here — no body parsing */
export function cronMethodHandlers(
  executor: (request: Request) => Promise<NextResponse>
): {
  GET: (request: Request) => Promise<NextResponse>;
  POST: (request: Request) => Promise<NextResponse>;
} {
  return {
    GET: executor,
    POST: executor,
  };
}
