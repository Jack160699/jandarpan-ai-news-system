/**
 * POST /api/cron/worker/:name — run a single queue worker
 */

import { NextResponse } from "next/server";
import { verifyCronRequest } from "@/lib/infrastructure/auth/cron-auth";
import { cronAuthFailureResponse } from "@/lib/infrastructure/auth/cron-response";
import { noStoreHeaders } from "@/lib/infrastructure/cache/edge";
import { runQueueWorker } from "@/lib/infrastructure/workers/registry";
import type { WorkerId } from "@/lib/infrastructure/workers/types";
import { runWorkerEndpoint } from "@/lib/infrastructure/workers/run-guard";
import { createExecutionDeadline } from "@/lib/serverless/deadline";
import { INFRA_CONFIG } from "@/lib/infrastructure/config";
import { isSupabaseConfigured } from "@/lib/supabase";

export const runtime = "nodejs";
/** Vercel Pro: raise to 300 if ingest routinely approaches 60s */
export const maxDuration = 120;

const VALID: WorkerId[] = [
  "ingest",
  "ai_enrich",
  "editorial_generate",
  "editorial_images",
  "job_processor",
  "intelligence_embed",
  "intelligence_snapshot",
  "analytics_aggregate",
  "dam_analyze",
  "event_cluster",
];

const LOCK_WINDOWS: Partial<Record<WorkerId, number>> = {
  intelligence_embed: 1140,
  intelligence_snapshot: 840,
  job_processor: 540,
};

type RouteParams = { params: Promise<{ name: string }> };

export async function POST(request: Request, { params }: RouteParams) {
  const auth = verifyCronRequest(request);
  if (!auth.authorized) {
    return cronAuthFailureResponse(auth);
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { ok: false, error: "Supabase not configured", processed: 0, failed: 0, duration_ms: 0 },
      { status: 500 }
    );
  }

  const { name } = await params;
  if (!VALID.includes(name as WorkerId)) {
    return NextResponse.json(
      { ok: false, error: "Invalid worker", valid: VALID, processed: 0, failed: 0, duration_ms: 0 },
      { status: 400 }
    );
  }

  const workerId = name as WorkerId;
  const lockSec = LOCK_WINDOWS[workerId] ?? 600;

  const payload = await runWorkerEndpoint(workerId, lockSec, async () => {
    const deadline = createExecutionDeadline(INFRA_CONFIG.ingestBudgetMs);
    const result = await runQueueWorker(workerId, {
      deadline,
      requestUrl: request.url,
    });

    const metadata = result.metadata as
      | { processed?: number; failed?: number; completed?: number }
      | undefined;

    const processed =
      metadata?.processed ??
      metadata?.completed ??
      (result.ok && !result.skipped ? 1 : 0);
    const failed =
      metadata?.failed ?? (result.ok || result.skipped ? 0 : 1);

    return {
      ok: result.ok,
      processed: Number(processed) || 0,
      failed: Number(failed) || 0,
      details: {
        result,
        timedOutSafely: deadline.timedOutSafely,
      },
    };
  });

  return NextResponse.json(payload, { headers: noStoreHeaders() });
}

export async function GET(request: Request, ctx: RouteParams) {
  return POST(request, ctx);
}
