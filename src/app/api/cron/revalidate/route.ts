/**
 * GET/POST /api/cron/revalidate — on-demand homepage ISR refresh (Vercel cron)
 */

import { NextResponse } from "next/server";
import { verifyCronRequest } from "@/lib/infrastructure/auth/cron-auth";
import { cronAuthFailureResponse } from "@/lib/infrastructure/auth/cron-response";
import { revalidateNewsroomCaches } from "@/lib/infrastructure/cache/isr";
import { noStoreHeaders } from "@/lib/infrastructure/cache/edge";
import { recordCronRun } from "@/lib/observability/cron-monitor";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function GET(request: Request) {
  return handleRevalidate(request);
}

export async function POST(request: Request) {
  return handleRevalidate(request);
}

async function handleRevalidate(request: Request) {
  const startedAt = Date.now();
  const auth = await verifyCronRequest(request);
  if (!auth.authorized) {
    return cronAuthFailureResponse(auth);
  }
  console.log(
    JSON.stringify({
      tag: "[cron_triggered]",
      job: "revalidate",
      path: new URL(request.url).pathname,
      ts: new Date().toISOString(),
    })
  );

  try {
    await revalidateNewsroomCaches();
    await recordCronRun({
      job: "revalidate",
      ok: true,
      startedAt: new Date(startedAt).toISOString(),
      durationMs: Date.now() - startedAt,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "revalidate_failed";
    await recordCronRun({
      job: "revalidate",
      ok: false,
      startedAt: new Date(startedAt).toISOString(),
      durationMs: Date.now() - startedAt,
      error: message,
    });
    return NextResponse.json(
      { ok: false, revalidated: false, error: message },
      { status: 500, headers: noStoreHeaders() }
    );
  }

  return NextResponse.json(
    {
      ok: true,
      revalidated: true,
      timestamp: new Date().toISOString(),
    },
    { headers: noStoreHeaders() }
  );
}
