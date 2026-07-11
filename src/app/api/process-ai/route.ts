/**
 * POST /api/process-ai — drain AI enrichment queue (max 10 per invocation)
 */

import { NextResponse } from "next/server";
import { verifyCronRequest } from "@/lib/infrastructure/auth/cron-auth";
import { noStoreHeaders } from "@/lib/infrastructure/cache/edge";
import { INFRA_CONFIG } from "@/lib/infrastructure/config";
import { revalidateNewsroomCaches } from "@/lib/infrastructure/cache/isr";
import { processAiQueueBatch } from "@/lib/news/ai/process";
import { countPendingAiQueue } from "@/lib/news/ai/queue";
import {
  finalizeCronRun,
  instrumentCronStart,
} from "@/lib/observability/cron-instrumentation";
import { isSupabaseConfigured } from "@/lib/supabase";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  const { startedAt, requestId } = instrumentCronStart("process-ai", request);

  if (!(await verifyCronRequest(request, { capability: "ingest" })).authorized) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401, headers: noStoreHeaders() }
    );
  }

  if (!isSupabaseConfigured()) {
    await finalizeCronRun({
      job: "process-ai",
      startedAt,
      requestId,
      ok: false,
      error: "supabase_not_configured",
      errorCode: "supabase_not_configured",
    });
    return NextResponse.json(
      { ok: false, error: "Supabase not configured" },
      { status: 500 }
    );
  }

  if (!process.env.OPENAI_API_KEY?.trim()) {
    await finalizeCronRun({
      job: "process-ai",
      startedAt,
      requestId,
      ok: true,
      degraded: true,
      errorCode: "openai_not_configured",
    });
    return NextResponse.json({
      ok: true,
      processed: 0,
      skipped: 0,
      pending: 0,
      message: "OPENAI_API_KEY not set",
    });
  }

  try {
    const result = await processAiQueueBatch(INFRA_CONFIG.aiQueueBatch);
    const pending = await countPendingAiQueue();

    if (result.processed > 0) {
      await revalidateNewsroomCaches();
    }

    await finalizeCronRun({
      job: "process-ai",
      startedAt,
      requestId,
      ok: true,
      entityCount: result.processed,
      metadata: { skipped: result.skipped, pending, failed: result.errors.length },
    });

    return NextResponse.json(
      {
        ok: true,
        processed: result.processed,
        skipped: result.skipped,
        errors: result.errors,
        pending,
        durationMs: Date.now() - startedAt,
      },
      { headers: noStoreHeaders() }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "process_ai_failed";
    await finalizeCronRun({
      job: "process-ai",
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

export async function GET(request: Request) {
  return POST(request);
}
