/**
 * POST /api/cron/orchestrate — full newsroom pipeline (Vercel cron entry)
 */

import { NextResponse } from "next/server";
import { verifyCronRequest } from "@/lib/infrastructure/auth/cron-auth";
import { noStoreHeaders } from "@/lib/infrastructure/cache/edge";
import {
  listWorkers,
  runCronOrchestration,
} from "@/lib/infrastructure/cron/orchestrator";
import type { WorkerId } from "@/lib/infrastructure/workers/types";
import { isSupabaseConfigured } from "@/lib/supabase";

export const runtime = "nodejs";
export const maxDuration = 60;

const VALID_WORKERS = new Set<WorkerId>([
  "ingest",
  "ai_enrich",
  "editorial_generate",
  "editorial_images",
]);

export async function GET(request: Request) {
  return handleOrchestrate(request);
}

export async function POST(request: Request) {
  return handleOrchestrate(request);
}

async function handleOrchestrate(request: Request) {
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

  let workers: WorkerId[] | undefined;
  try {
    const body = (await request.json()) as { workers?: string[] };
    if (Array.isArray(body.workers)) {
      workers = body.workers.filter((w): w is WorkerId =>
        VALID_WORKERS.has(w as WorkerId)
      );
    }
  } catch {
    /* default pipeline */
  }

  const result = await runCronOrchestration({
    requestUrl: request.url,
    workers,
  });

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
