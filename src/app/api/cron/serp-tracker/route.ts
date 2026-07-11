/**
 * GET/POST /api/cron/serp-tracker — SERP intelligence ranking tracker (twice daily)
 */

import { NextResponse } from "next/server";
import { runSerpTracker } from "@/lib/serp-intelligence/engine";
import { isSerpTrackerEnabled } from "@/lib/serp-intelligence/config";
import { verifyCronRequest } from "@/lib/infrastructure/auth/cron-auth";
import { cronAuthFailureResponse } from "@/lib/infrastructure/auth/cron-response";
import { noStoreHeaders } from "@/lib/infrastructure/cache/edge";
import { recordCronRun } from "@/lib/observability/cron-monitor";
import { pipelineLog } from "@/lib/observability/production-log";

export const runtime = "nodejs";
export const maxDuration = 300;

async function handle(request: Request) {
  const startedAt = Date.now();
  const auth = await verifyCronRequest(request);
  if (!auth.authorized) {
    return cronAuthFailureResponse(auth);
  }

  pipelineLog("[cron_triggered]", {
    job: "serp-tracker",
    path: new URL(request.url).pathname,
    enabled: isSerpTrackerEnabled(),
    ts: new Date().toISOString(),
  });

  const result = await runSerpTracker();
  const durationMs = Date.now() - startedAt;

  await recordCronRun({
    job: "serp-tracker",
    ok: result.ok,
    startedAt: new Date(startedAt).toISOString(),
    durationMs,
    degraded: result.status === "skipped",
    ...(result.ok ? {} : { error: result.errors[0] ?? "serp_tracker_failed" }),
  });

  return NextResponse.json(
    {
      worker: "serp-tracker",
      ...result,
      durationMs,
    },
    {
      status: result.ok ? 200 : 500,
      headers: noStoreHeaders(),
    }
  );
}

export async function GET(request: Request) {
  return handle(request);
}

export async function POST(request: Request) {
  return handle(request);
}
