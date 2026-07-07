/**
 * POST /api/cron/data-retention — daily TTL cleanup for logs, signals, archives.
 * Vercel cron backup + QStash schedule at 02:30 UTC.
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyCronRequest } from "@/lib/infrastructure/auth/cron-auth";
import { cronAuthFailureResponse } from "@/lib/infrastructure/auth/cron-response";
import { noStoreHeaders } from "@/lib/infrastructure/cache/edge";
import { runDataRetention } from "@/lib/ops/data-retention";
import { isSupabaseConfigured } from "@/lib/supabase";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function GET(request: NextRequest) {
  return handleRetention(request);
}

export async function POST(request: NextRequest) {
  return handleRetention(request);
}

async function handleRetention(request: NextRequest) {
  const auth = await verifyCronRequest(request);
  if (!auth.authorized) {
    return cronAuthFailureResponse(auth);
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { ok: false, error: "Supabase not configured" },
      { status: 500, headers: noStoreHeaders() }
    );
  }

  const body = (await request.json().catch(() => ({}))) as {
    dryRun?: boolean;
    skipQueueCleanup?: boolean;
  };

  const result = await runDataRetention({
    dryRun: body.dryRun === true,
    skipQueueCleanup: body.skipQueueCleanup === true,
  });

  return NextResponse.json(result, { headers: noStoreHeaders() });
}
