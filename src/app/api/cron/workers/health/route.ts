/**
 * GET /api/cron/workers/health — job queue stats + worker run health
 */

import { NextResponse } from "next/server";
import { verifyCronRequest } from "@/lib/infrastructure/auth/cron-auth";
import { cronAuthFailureResponse } from "@/lib/infrastructure/auth/cron-response";
import { noStoreHeaders } from "@/lib/infrastructure/cache/edge";
import {
  getQueueStats,
  getWorkerHealth,
} from "@/lib/infrastructure/jobs/monitor";
import { listWorkers } from "@/lib/infrastructure/cron/orchestrator";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = verifyCronRequest(request);
  if (!auth.authorized) {
    return cronAuthFailureResponse(auth);
  }

  const [stats, health] = await Promise.all([
    getQueueStats(),
    getWorkerHealth(24),
  ]);

  return NextResponse.json(
    {
      ok: true,
      workers: listWorkers(),
      queue: stats,
      health,
      checkedAt: new Date().toISOString(),
    },
    { headers: noStoreHeaders() }
  );
}
