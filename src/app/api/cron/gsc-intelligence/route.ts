/**
 * GET/POST /api/cron/gsc-intelligence — Google Search Console sync (daily)
 */

import { NextResponse } from "next/server";
import { runGscEngine } from "@/lib/gsc-intelligence/engine";
import { isGscEngineEnabled } from "@/lib/gsc-intelligence/config";
import { verifyCronRequest } from "@/lib/infrastructure/auth/cron-auth";
import { cronAuthFailureResponse } from "@/lib/infrastructure/auth/cron-response";
import { noStoreHeaders } from "@/lib/infrastructure/cache/edge";
import { recordCronRun } from "@/lib/observability/cron-monitor";
import { pipelineLog } from "@/lib/observability/production-log";

export const runtime = "nodejs";
export const maxDuration = 300;

async function handle(request: Request) {
  const startedAt = Date.now();
  const auth = await verifyCronRequest(request, { capability: "ops" });
  if (!auth.authorized) {
    return cronAuthFailureResponse(auth);
  }

  pipelineLog("[cron_triggered]", {
    job: "gsc-intelligence",
    path: new URL(request.url).pathname,
    enabled: isGscEngineEnabled(),
    ts: new Date().toISOString(),
  });

  const result = await runGscEngine();
  const durationMs = Date.now() - startedAt;

  await recordCronRun({
    job: "gsc-intelligence",
    ok: result.ok,
    startedAt: new Date(startedAt).toISOString(),
    durationMs,
    degraded: result.status === "skipped",
    ...(result.ok ? {} : { error: result.errors[0] ?? "gsc_sync_failed" }),
  });

  return NextResponse.json(
    {
      worker: "gsc-intelligence",
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
