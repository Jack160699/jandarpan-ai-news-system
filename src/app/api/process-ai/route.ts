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
import { isSupabaseConfigured } from "@/lib/supabase";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  if (!(await verifyCronRequest(request)).authorized) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401, headers: noStoreHeaders() }
    );
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { ok: false, error: "Supabase not configured" },
      { status: 500 }
    );
  }

  if (!process.env.OPENAI_API_KEY?.trim()) {
    return NextResponse.json({
      ok: true,
      processed: 0,
      skipped: 0,
      pending: 0,
      message: "OPENAI_API_KEY not set",
    });
  }

  const startedAt = Date.now();
  const result = await processAiQueueBatch(INFRA_CONFIG.aiQueueBatch);
  const pending = await countPendingAiQueue();

  if (result.processed > 0) {
    await revalidateNewsroomCaches();
  }

  return NextResponse.json({
    ok: true,
    processed: result.processed,
    skipped: result.skipped,
    errors: result.errors,
    pending,
    durationMs: Date.now() - startedAt,
  }, { headers: noStoreHeaders() });
}

export async function GET(request: Request) {
  return POST(request);
}
