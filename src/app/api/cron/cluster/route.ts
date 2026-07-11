/**
 * GET/POST /api/cron/cluster — signal → event clustering (hourly)
 */

import { NextResponse } from "next/server";
import { verifyCronRequest } from "@/lib/infrastructure/auth/cron-auth";
import { cronAuthFailureResponse } from "@/lib/infrastructure/auth/cron-response";
import { noStoreHeaders } from "@/lib/infrastructure/cache/edge";
import { clusterRecentSignals } from "@/lib/newsroom";
import {
  finalizeCronRun,
  instrumentCronStart,
} from "@/lib/observability/cron-instrumentation";
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
  const { startedAt, requestId } = instrumentCronStart("cluster", request);
  const auth = await verifyCronRequest(request, { capability: "pipeline" });
  if (!auth.authorized) {
    return cronAuthFailureResponse(auth);
  }

  if (!isSupabaseConfigured()) {
    await finalizeCronRun({
      job: "cluster",
      startedAt,
      requestId,
      ok: false,
      error: "supabase_not_configured",
      errorCode: "supabase_not_configured",
    });
    return NextResponse.json(
      { ok: false, error: "Supabase not configured" },
      { status: 500, headers: noStoreHeaders() }
    );
  }

  try {
    const result = await clusterRecentSignals(120);
    const entityCount =
      result.eventsCreated + result.signalsProcessed + result.duplicatesMerged;

    await finalizeCronRun({
      job: "cluster",
      startedAt,
      requestId,
      ok: !result.skipped,
      degraded: Boolean(result.skipped),
      entityCount,
      metadata: {
        eventsCreated: result.eventsCreated,
        signalsProcessed: result.signalsProcessed,
        duplicatesMerged: result.duplicatesMerged,
      },
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
  } catch (err) {
    const message = err instanceof Error ? err.message : "cluster_failed";
    await finalizeCronRun({
      job: "cluster",
      startedAt,
      requestId,
      ok: false,
      error: message,
      err,
    });
    return NextResponse.json(
      { ok: false, error: message },
      { status: 500, headers: noStoreHeaders() }
    );
  }
}
