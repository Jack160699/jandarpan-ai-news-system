import { NextResponse } from "next/server";
import { verifyCronRequest } from "@/lib/infrastructure/auth/cron-auth";
import { cronAuthFailureResponse } from "@/lib/infrastructure/auth/cron-response";
import { noStoreHeaders } from "@/lib/infrastructure/cache/edge";
import { getQueueStats, getWorkerHealth } from "@/lib/infrastructure/jobs/monitor";
import { listWorkers } from "@/lib/infrastructure/cron/orchestrator";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request) {
  const auth = await verifyCronRequest(request);
  if (!auth.authorized) return cronAuthFailureResponse(auth);

  const started = Date.now();
  const [queue, health] = await Promise.all([getQueueStats(), getWorkerHealth(24)]);

  return NextResponse.json(
    {
      ok: true,
      supabaseConfigured: isSupabaseConfigured(),
      durationMs: Date.now() - started,
      workers: listWorkers(),
      queue,
      health,
      checkedAt: new Date().toISOString(),
    },
    { headers: noStoreHeaders() }
  );
}

