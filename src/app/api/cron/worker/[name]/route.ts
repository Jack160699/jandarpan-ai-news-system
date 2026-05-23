/**
 * POST /api/cron/worker/:name — run a single queue worker
 */

import { NextResponse } from "next/server";
import { verifyCronRequest } from "@/lib/infrastructure/auth/cron-auth";
import { cronAuthFailureResponse } from "@/lib/infrastructure/auth/cron-response";
import { noStoreHeaders } from "@/lib/infrastructure/cache/edge";
import { runQueueWorker } from "@/lib/infrastructure/workers/registry";
import type { WorkerId } from "@/lib/infrastructure/workers/types";
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
];

type RouteParams = { params: Promise<{ name: string }> };

export async function POST(request: Request, { params }: RouteParams) {
  const auth = verifyCronRequest(request);
  if (!auth.authorized) {
    return cronAuthFailureResponse(auth);
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { ok: false, error: "Supabase not configured" },
      { status: 500 }
    );
  }

  const { name } = await params;
  if (!VALID.includes(name as WorkerId)) {
    return NextResponse.json(
      { ok: false, error: "Invalid worker", valid: VALID },
      { status: 400 }
    );
  }

  const deadline = createExecutionDeadline(INFRA_CONFIG.ingestBudgetMs);
  const result = await runQueueWorker(name as WorkerId, {
    deadline,
    requestUrl: request.url,
  });

  return NextResponse.json(
    { ok: result.ok, result, timedOutSafely: deadline.timedOutSafely },
    { headers: noStoreHeaders() }
  );
}

export async function GET(request: Request, ctx: RouteParams) {
  return POST(request, ctx);
}
