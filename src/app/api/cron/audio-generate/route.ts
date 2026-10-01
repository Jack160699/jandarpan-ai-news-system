/**
 * Audio generation worker — Google Gemini-TTS (primary) / Chirp 3 HD (fallback).
 *
 * Every few minutes: enqueue audio for recently published stories that have none, claim a small
 * bounded batch, synthesize, validate and store. Fully decoupled from publication — a TTS outage
 * only leaves audio rows pending/failed with backoff.
 */

import { NextResponse } from "next/server";
import { verifyCronRequest } from "@/lib/infrastructure/auth/cron-auth";
import { cronAuthFailureResponse } from "@/lib/infrastructure/auth/cron-response";
import { noStoreHeaders } from "@/lib/infrastructure/cache/edge";
import { runWorkerEndpoint } from "@/lib/infrastructure/workers/run-guard";
import { createExecutionDeadline } from "@/lib/serverless/deadline";
import { detectCronTrigger, recordCronRun } from "@/lib/observability/cron-monitor";
import { isSupabaseConfigured } from "@/lib/supabase";
import { googleTtsConfigured } from "@/lib/voice/google-auth";
import { audioGenerationEnabled } from "@/lib/voice/enabled";
import { runAudioBatch } from "@/lib/voice/generate-article-audio";

export const runtime = "nodejs";
export const maxDuration = 300;
export const dynamic = "force-dynamic";

const JOB = "audio-generate";

async function handle(request: Request) {
  const startedAt = Date.now();
  const auth = await verifyCronRequest(request, { capability: "pipeline" });
  if (!auth.authorized) return cronAuthFailureResponse(auth);

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: false, error: "supabase_not_configured" }, { status: 500, headers: noStoreHeaders() });
  }
  if (!audioGenerationEnabled()) {
    // No DB write, no provider call: a disabled worker must cost nothing.
    return NextResponse.json(
      { ok: true, skipped: true, reason: "audio_generation_disabled" },
      { headers: noStoreHeaders() }
    );
  }
  if (!googleTtsConfigured()) {
    await recordCronRun({
      job: JOB,
      ok: true,
      startedAt: new Date(startedAt).toISOString(),
      durationMs: Date.now() - startedAt,
      degraded: true,
      trigger: detectCronTrigger(request),
      metadata: { skipped: "GOOGLE_TTS_SERVICE_ACCOUNT_JSON not configured" },
    });
    return NextResponse.json({ ok: true, skipped: true, reason: "google_tts_not_configured" }, { headers: noStoreHeaders() });
  }

  // 200s of work inside a 300s function; stop starting new syntheses with 45s left.
  const deadline = createExecutionDeadline(Math.ceil(200_000 / 0.82));
  const limit = Math.max(1, Math.min(10, Number(process.env.AUDIO_BATCH_LIMIT) || 4));

  const result = await runWorkerEndpoint(JOB, 360, async () => {
    const batch = await runAudioBatch({ limit, shouldStop: () => !deadline.hasBudgetFor(45_000) });
    return {
      ok: true,
      degraded: batch.failed > 0,
      processed: batch.ready,
      failed: batch.failed,
      details: { ...batch },
    };
  });

  if (result.skipped) {
    return NextResponse.json({ ok: true, skipped: true, reason: result.reason }, { headers: noStoreHeaders() });
  }

  const d = (result.details ?? {}) as Record<string, unknown>;
  await recordCronRun({
    job: JOB,
    ok: result.ok,
    startedAt: new Date(startedAt).toISOString(),
    durationMs: Date.now() - startedAt,
    degraded: Boolean(result.degraded),
    trigger: detectCronTrigger(request),
    processed: result.processed,
    failed: result.failed,
    ...(result.ok ? {} : { error: result.reason ?? "audio_generate_failed" }),
    metadata: { enqueued: d.enqueued, claimed: d.claimed, ready: d.ready, failed: d.failed },
  });

  return NextResponse.json(
    { ok: result.ok, processed: result.processed, failed: result.failed, durationMs: Date.now() - startedAt, details: d },
    { headers: noStoreHeaders() }
  );
}

export const GET = handle;
export const POST = handle;
