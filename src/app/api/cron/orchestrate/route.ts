/**
 * POST /api/cron/orchestrate — scheduled intelligence pipeline runner.
 * QStash fires this at :15/:45 UTC; runs INTELLIGENCE_PIPELINE workers inline.
 * Manual runs also supported via POST with optional { workers: [...] } body.
 */

import { NextResponse } from "next/server";
import { verifyCronRequest } from "@/lib/infrastructure/auth/cron-auth";
import { cronAuthFailureResponse } from "@/lib/infrastructure/auth/cron-response";
import { noStoreHeaders } from "@/lib/infrastructure/cache/edge";
import {
  INTELLIGENCE_PIPELINE,
  listWorkers,
  runCronOrchestration,
} from "@/lib/infrastructure/cron/orchestrator";
import { runWorkerEndpoint } from "@/lib/infrastructure/workers/run-guard";
import type { WorkerId } from "@/lib/infrastructure/workers/types";
import { recordCronRun } from "@/lib/observability/cron-monitor";
import { isSupabaseConfigured } from "@/lib/supabase";

export const runtime = "nodejs";
export const maxDuration = 60;

const VALID_WORKERS = new Set<WorkerId>([
  ...INTELLIGENCE_PIPELINE,
  "ingest",
  "editorial_generate",
]);

export async function GET(request: Request) {
  return handleOrchestrate(request);
}

export async function POST(request: Request) {
  return handleOrchestrate(request);
}

async function handleOrchestrate(request: Request) {
  const startedAt = Date.now();
  const rawBody = await request.text();
  const auth = await verifyCronRequest(request, { rawBody });
  if (!auth.authorized) {
    return cronAuthFailureResponse(auth);
  }
  console.log(
    JSON.stringify({
      tag: "[cron_triggered]",
      job: "orchestrate",
      path: new URL(request.url).pathname,
      ts: new Date().toISOString(),
    })
  );

  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { ok: false, error: "Supabase not configured" },
      { status: 500, headers: noStoreHeaders() }
    );
  }

  let workers: WorkerId[] | undefined;
  if (rawBody.trim()) {
    try {
      const body = JSON.parse(rawBody) as { workers?: string[] };
      if (Array.isArray(body.workers)) {
        workers = body.workers.filter((w): w is WorkerId =>
          VALID_WORKERS.has(w as WorkerId)
        );
      }
    } catch {
      /* default pipeline */
    }
  }

  const lockResult = await runWorkerEndpoint("orchestrate", 1700, async () => {
    const result = await runCronOrchestration({
      requestUrl: request.url,
      workers: workers?.length ? workers : undefined,
    });
    return {
      ok: result.ok,
      processed: result.workers.filter((w) => w.ok && !w.skipped).length,
      failed: result.workers.filter((w) => !w.ok && !w.skipped).length,
      details: { result },
    };
  });

  if (lockResult.skipped && lockResult.reason === "overlap_lock") {
    await recordCronRun({
      job: "orchestrate",
      ok: true,
      startedAt: new Date(startedAt).toISOString(),
      durationMs: lockResult.duration_ms,
      degraded: true,
    });
    return NextResponse.json(
      {
        ok: true,
        skipped: true,
        reason: "overlap_lock",
        durationMs: lockResult.duration_ms,
        availableWorkers: listWorkers(),
      },
      { headers: noStoreHeaders() }
    );
  }

  const result = lockResult.details?.result as Awaited<
    ReturnType<typeof runCronOrchestration>
  > | undefined;

  if (!result) {
    await recordCronRun({
      job: "orchestrate",
      ok: false,
      startedAt: new Date(startedAt).toISOString(),
      durationMs: lockResult.duration_ms,
      error: lockResult.reason ?? "orchestrate_failed",
    });
    return NextResponse.json(
      {
        ok: false,
        error: lockResult.reason ?? "orchestrate_failed",
        durationMs: lockResult.duration_ms,
      },
      { status: 500, headers: noStoreHeaders() }
    );
  }

  return NextResponse.json(
    {
      ok: result.ok,
      durationMs: result.durationMs,
      timedOutSafely: result.timedOutSafely,
      degraded: result.degraded,
      workers: result.workers,
      availableWorkers: listWorkers(),
    },
    {
      headers: noStoreHeaders(),
    }
  );
}
