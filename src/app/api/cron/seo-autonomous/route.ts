/**
 * GET/POST /api/cron/seo-autonomous — autonomous SEO pipeline (every 6 hours)
 */

import { NextResponse } from "next/server";
import { runAutonomousSeoEngine } from "@/lib/seo-autonomous/engine";
import { isAutonomousSeoEnabled } from "@/lib/seo-autonomous/config";
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
    job: "seo-autonomous",
    path: new URL(request.url).pathname,
    enabled: isAutonomousSeoEnabled(),
    ts: new Date().toISOString(),
  });

  const result = await runAutonomousSeoEngine();
  const durationMs = Date.now() - startedAt;

  await recordCronRun({
    job: "seo-autonomous",
    ok: result.ok,
    startedAt: new Date(startedAt).toISOString(),
    durationMs,
    degraded: result.status === "skipped",
    ...(result.ok ? {} : { error: result.errors[0] ?? "autonomous_seo_failed" }),
  });

  return NextResponse.json(
    {
      worker: "seo-autonomous",
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
