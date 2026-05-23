/**
 * POST /api/debug/run-newsroom-cycle — dev-only full pipeline executor
 */

import { NextResponse } from "next/server";
import { noStoreHeaders } from "@/lib/infrastructure/cache/edge";
import {
  assertDevNewsroomDebug,
  isDevNewsroomDebugAllowed,
} from "@/lib/newsroom/debug/guard";
import { runFullNewsroomCycle } from "@/lib/newsroom/debug/cycle";
import { isSupabaseConfigured } from "@/lib/supabase";
import type { WorkerId } from "@/lib/infrastructure/workers/types";

export const runtime = "nodejs";
export const maxDuration = 300;

const VALID_WORKERS = new Set<WorkerId>([
  "ingest",
  "ai_enrich",
  "editorial_generate",
  "editorial_images",
]);

export async function GET(request: Request) {
  return handleCycle(request);
}

export async function POST(request: Request) {
  return handleCycle(request);
}

async function handleCycle(request: Request) {
  if (!isDevNewsroomDebugAllowed()) {
    return NextResponse.json(
      { ok: false, error: "Forbidden — newsroom debug is disabled in production" },
      { status: 403, headers: noStoreHeaders() }
    );
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { ok: false, error: "Supabase not configured" },
      { status: 500, headers: noStoreHeaders() }
    );
  }

  try {
    assertDevNewsroomDebug();
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "forbidden" },
      { status: 403, headers: noStoreHeaders() }
    );
  }

  let workers: WorkerId[] | undefined;
  let refreshHomepage = true;

  try {
    const body = (await request.json()) as {
      workers?: string[];
      refreshHomepage?: boolean;
    };
    if (Array.isArray(body.workers)) {
      workers = body.workers.filter((w): w is WorkerId =>
        VALID_WORKERS.has(w as WorkerId)
      );
    }
    if (typeof body.refreshHomepage === "boolean") {
      refreshHomepage = body.refreshHomepage;
    }
  } catch {
    /* defaults */
  }

  const result = await runFullNewsroomCycle({
    requestUrl: request.url,
    workers,
    refreshHomepage,
  });

  return NextResponse.json(
    {
      ok: result.ok,
      durationMs: result.durationMs,
      degraded: result.degraded,
      timedOutSafely: result.timedOutSafely,
      delta: result.delta,
      pipelineHealth: result.pipelineHealth,
      blockers: result.blockers,
      workers: result.orchestration.workers,
      logs: result.logs,
      before: {
        capturedAt: result.before.capturedAt,
        counts: result.before.counts,
        homepage: result.before.homepage,
      },
      after: {
        capturedAt: result.after.capturedAt,
        counts: result.after.counts,
        homepage: result.after.homepage,
        latest: result.after.latest,
      },
    },
    { headers: noStoreHeaders() }
  );
}
