/**
 * GET/POST /api/cron/cluster — signal → event clustering (hourly)
 */

import { NextResponse } from "next/server";
import { verifyCronRequest } from "@/lib/infrastructure/auth/cron-auth";
import { noStoreHeaders } from "@/lib/infrastructure/cache/edge";
import { clusterRecentSignals } from "@/lib/newsroom";
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
  const auth = verifyCronRequest(request);
  if (!auth.authorized) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401, headers: noStoreHeaders() }
    );
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { ok: false, error: "Supabase not configured" },
      { status: 500, headers: noStoreHeaders() }
    );
  }

  const result = await clusterRecentSignals(120);

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
