/**
 * GET/POST /api/cron/cluster — signal → event clustering (hourly)
 */

import { NextResponse } from "next/server";
import { verifyCronRequest } from "@/lib/infrastructure/auth/cron-auth";
import { cronAuthFailureResponse } from "@/lib/infrastructure/auth/cron-response";
import { noStoreHeaders } from "@/lib/infrastructure/cache/edge";
import { clusterRecentSignals } from "@/lib/newsroom";
import { recordCronRun } from "@/lib/observability/cron-monitor";
import { isSupabaseConfigured } from "@/lib/supabase";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function GET(request: Request) {
  return handleCluster(request);
}

export async function POST(request: Request) {
  return handleCluster(request);
}

async function handleCluster(request: Request) {
  const startedAt = Date.now();
  const auth = verifyCronRequest(request);
  if (!auth.authorized) {
    return cronAuthFailureResponse(auth);
  }
  console.log(
    JSON.stringify({
      tag: "[cron_triggered]",
      job: "cluster",
      path: new URL(request.url).pathname,
      ts: new Date().toISOString(),
    })
  );

  if (!isSupabaseConfigured()) {
    await recordCronRun({
      job: "cluster",
      ok: false,
      startedAt: new Date(startedAt).toISOString(),
      durationMs: Date.now() - startedAt,
      error: "supabase_not_configured",
    });
    return NextResponse.json(
      { ok: false, error: "Supabase not configured" },
      { status: 500, headers: noStoreHeaders() }
    );
  }

  const result = await clusterRecentSignals(120);
  await recordCronRun({
    job: "cluster",
    ok: !result.skipped,
    startedAt: new Date(startedAt).toISOString(),
    durationMs: Date.now() - startedAt,
    degraded: Boolean(result.skipped),
  });

  return NextResponse.json(
    {
      ok: !result.skipped,
      skipped: result.skipped ?? false,
      eventsCreated: result.eventsCreated,
      signalsProcessed: result.signalsProcessed,
      duplicatesMerged: result.duplicatesMerged,
    },
    { headers: noStoreHeaders() }
  );
}
