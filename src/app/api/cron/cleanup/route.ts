/**
 * POST /api/cron/cleanup — daily retention + optional queue stale-job purge.
 * QStash primary; Vercel cron backup at 03:30 UTC.
 */

import { NextResponse } from "next/server";
import { verifyCronRequest } from "@/lib/infrastructure/auth/cron-auth";
import { cronAuthFailureResponse } from "@/lib/infrastructure/auth/cron-response";
import { noStoreHeaders } from "@/lib/infrastructure/cache/edge";
import { runProductionRetention } from "@/lib/ops/data-retention";
import { recordCronRun } from "@/lib/observability/cron-monitor";
import { pipelineLog } from "@/lib/observability/production-log";
import { isSupabaseConfigured } from "@/lib/supabase";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function GET(request: Request) {
  return handleCleanup(request);
}

export async function POST(request: Request) {
  return handleCleanup(request);
}

async function handleCleanup(request: Request) {
  const startedAt = Date.now();
  const auth = await verifyCronRequest(request, { capability: "pipeline" });
  if (!auth.authorized) {
    return cronAuthFailureResponse(auth);
  }

  pipelineLog("[cron_triggered]", {
    job: "cleanup",
    path: new URL(request.url).pathname,
    ts: new Date().toISOString(),
  });

  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { ok: false, error: "Supabase not configured" },
      { status: 500, headers: noStoreHeaders() }
    );
  }

  let skipQueueCleanup = false;
  try {
    const body = await request.json();
    if (body && typeof body === "object" && body.skipQueueCleanup === true) {
      skipQueueCleanup = true;
    }
  } catch {
    /* empty body */
  }

  const result = await runProductionRetention({ skipQueueCleanup });

  await recordCronRun({
    job: "cleanup",
    ok: result.ok,
    startedAt: new Date(startedAt).toISOString(),
    durationMs: result.durationMs,
    degraded: !result.ok,
    error: result.error,
  });

  return NextResponse.json(result, {
    status: result.ok ? 200 : 500,
    headers: noStoreHeaders(),
  });
}
