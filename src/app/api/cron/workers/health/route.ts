/**
 * GET /api/cron/workers/health — job queue stats + worker run health
 */

import { NextResponse } from "next/server";
import { verifyCronRequest } from "@/lib/infrastructure/auth/cron-auth";
import { cronAuthFailureResponse } from "@/lib/infrastructure/auth/cron-response";
import { noStoreHeaders } from "@/lib/infrastructure/cache/edge";
import { isCacheDegraded } from "@/lib/infrastructure/workers/run-guard";
import {
  getQueueStats,
  getWorkerHealth,
} from "@/lib/infrastructure/jobs/monitor";
import { listWorkers } from "@/lib/infrastructure/cron/orchestrator";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CRITICAL_DEAD_LETTERS = Number(process.env.WORKER_CRITICAL_DLQ) || 50;
const CRITICAL_CLAIMED_STALE = Number(process.env.WORKER_CRITICAL_CLAIMED) || 15;
const CRITICAL_SUCCESS_RATE = Number(process.env.WORKER_CRITICAL_SUCCESS_RATE) || 0.35;

function evaluateCriticalHealth(input: {
  queue: Awaited<ReturnType<typeof getQueueStats>>;
  health: Awaited<ReturnType<typeof getWorkerHealth>>;
}): { critical: boolean; reasons: string[] } {
  const reasons: string[] = [];

  if (input.queue.deadLetters >= CRITICAL_DEAD_LETTERS) {
    reasons.push(`dead_letters:${input.queue.deadLetters}`);
  }

  if (input.queue.claimed >= CRITICAL_CLAIMED_STALE) {
    reasons.push(`claimed_stuck:${input.queue.claimed}`);
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

export async function GET(request: Request) {
  const auth = verifyCronRequest(request);
  if (!auth.authorized) {
    return cronAuthFailureResponse(auth);
  }

  const started = Date.now();
  const [stats, health] = await Promise.all([
    getQueueStats(),
    getWorkerHealth(24),
  ]);

  const evaluation = evaluateCriticalHealth({ queue: stats, health });

  return NextResponse.json(
    {
      ok: !evaluation.critical,
      critical: evaluation.critical,
      criticalReasons: evaluation.reasons,
      workers: listWorkers(),
      queue: stats,
      health,
      cacheDegraded: isCacheDegraded(),
      checkedAt: new Date().toISOString(),
      duration_ms: Date.now() - started,
    },
    {
      status: evaluation.critical ? 503 : 200,
      headers: noStoreHeaders(),
    }
  );
}
