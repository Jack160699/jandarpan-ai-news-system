/**
 * GET/POST /api/cron/competitor-tracker — competitor intelligence crawl (every 30 min)
 */

import { NextResponse } from "next/server";
import { runCompetitorIntelligenceCrawl } from "@/lib/competitor-intelligence/collector";
import { isCompetitorTrackerEnabled } from "@/lib/competitor-intelligence/config";
import { verifyCronRequest } from "@/lib/infrastructure/auth/cron-auth";
import { cronAuthFailureResponse } from "@/lib/infrastructure/auth/cron-response";
import { noStoreHeaders } from "@/lib/infrastructure/cache/edge";
import { recordCronRun } from "@/lib/observability/cron-monitor";
import { pipelineLog } from "@/lib/observability/production-log";

export const runtime = "nodejs";
export const maxDuration = 120;

async function handle(request: Request) {
  const startedAt = Date.now();
  const auth = await verifyCronRequest(request);
  if (!auth.authorized) {
    return cronAuthFailureResponse(auth);
  }

  pipelineLog("[cron_triggered]", {
    job: "competitor-tracker",
    path: new URL(request.url).pathname,
    enabled: isCompetitorTrackerEnabled(),
    ts: new Date().toISOString(),
  });

  const result = await runCompetitorIntelligenceCrawl();
  const durationMs = Date.now() - startedAt;

  await recordCronRun({
    job: "competitor-tracker",
    ok: result.ok,
    startedAt: new Date(startedAt).toISOString(),
    durationMs,
    degraded: result.status === "skipped",
    ...(result.ok ? {} : { error: result.errors[0] ?? "competitor_crawl_failed" }),
  });

  return NextResponse.json(
    {
      worker: "competitor-tracker",
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
