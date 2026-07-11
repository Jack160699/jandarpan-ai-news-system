/**
 * GET/POST /api/cron/seo-intelligence — SEO intelligence analysis (runs after competitor tracker)
 */

import { NextResponse } from "next/server";
import { runSeoIntelligenceEngine } from "@/lib/seo-intelligence/engine";
import { isSeoIntelligenceEnabled } from "@/lib/seo-intelligence/config";
import { verifyCronRequest } from "@/lib/infrastructure/auth/cron-auth";
import { cronAuthFailureResponse } from "@/lib/infrastructure/auth/cron-response";
import { noStoreHeaders } from "@/lib/infrastructure/cache/edge";
import { recordCronRun } from "@/lib/observability/cron-monitor";
import { pipelineLog } from "@/lib/observability/production-log";

export const runtime = "nodejs";
export const maxDuration = 120;

async function handle(request: Request) {
  const startedAt = Date.now();
  const auth = await verifyCronRequest(request, { capability: "ops" });
  if (!auth.authorized) {
    return cronAuthFailureResponse(auth);
  }

  pipelineLog("[cron_triggered]", {
    job: "seo-intelligence",
    path: new URL(request.url).pathname,
    enabled: isSeoIntelligenceEnabled(),
    ts: new Date().toISOString(),
  });

  const result = await runSeoIntelligenceEngine();
  const durationMs = Date.now() - startedAt;

  await recordCronRun({
    job: "seo-intelligence",
    ok: result.ok,
    startedAt: new Date(startedAt).toISOString(),
    durationMs,
    degraded: result.status === "skipped",
    ...(result.ok ? {} : { error: result.errors[0] ?? "seo_intelligence_failed" }),
  });

  return NextResponse.json(
    {
      worker: "seo-intelligence",
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
