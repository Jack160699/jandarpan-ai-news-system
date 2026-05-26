/**
 * POST /api/cron/jobs — drain unified worker job queue + event bus
 */

import { NextResponse } from "next/server";
import { verifyCronRequest } from "@/lib/infrastructure/auth/cron-auth";
import { cronAuthFailureResponse } from "@/lib/infrastructure/auth/cron-response";
import { noStoreHeaders } from "@/lib/infrastructure/cache/edge";
import { deliverPendingEvents } from "@/lib/infrastructure/events/event-bus";
import { JOB_HANDLERS } from "@/lib/infrastructure/jobs/handlers";
import { getQueueStats } from "@/lib/infrastructure/jobs/monitor";
import { processJobBatch } from "@/lib/infrastructure/jobs/queue";
import { INFRA_CONFIG } from "@/lib/infrastructure/config";
import { runWorkerEndpoint } from "@/lib/infrastructure/workers/run-guard";
import { isSupabaseConfigured } from "@/lib/supabase";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(request: Request) {
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

  const payload = await runWorkerEndpoint("cron_jobs", 540, async () => {
    const events = await deliverPendingEvents(20);
    const batch = await processJobBatch(JOB_HANDLERS, {
      limit: INFRA_CONFIG.workerJobBatch,
      workerId: "cron_jobs",
    });
    const stats = await getQueueStats();

    return {
      ok: batch.failed === 0,
      processed: batch.processed,
      failed: batch.failed + batch.dead,
      details: { events, batch, stats },
    };
  });

  return NextResponse.json(payload, { headers: noStoreHeaders() });
}

export async function GET(request: Request) {
  return POST(request);
}
