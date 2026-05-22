/**
 * POST /api/process-ai — drain AI enrichment queue (max 10 per invocation)
 */

import { NextResponse } from "next/server";
import { processAiQueueBatch } from "@/lib/news/ai/process";
import { countPendingAiQueue } from "@/lib/news/ai/queue";
import { revalidateLiveHomepage } from "@/lib/news/revalidate-home";
import { isSupabaseConfigured } from "@/lib/supabase";

export const runtime = "nodejs";
export const maxDuration = 60;

function parseBearerToken(authorization: string | null): string | null {
  if (!authorization) return null;
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : null;
}

function checkCronAuth(request: Request): boolean {
  const cronSecret = process.env.CRON_SECRET?.trim() || null;
  const bearer = parseBearerToken(request.headers.get("authorization"));
  const header = request.headers.get("x-cron-secret")?.trim() ?? null;

  if (cronSecret && (bearer === cronSecret || header === cronSecret)) {
    return true;
  }

  if (process.env.NODE_ENV === "development" && !cronSecret) {
    return true;
  }

  return false;
}

export async function POST(request: Request) {
  if (!checkCronAuth(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
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
  const result = await processAiQueueBatch(10);
  const pending = await countPendingAiQueue();

  if (result.processed > 0) {
    revalidateLiveHomepage();
  }

  return NextResponse.json({
    ok: true,
    processed: result.processed,
    skipped: result.skipped,
    errors: result.errors,
    pending,
    durationMs: Date.now() - startedAt,
  });
}

export async function GET(request: Request) {
  return POST(request);
}
