/**
 * GET/POST /api/cron/revalidate — on-demand homepage ISR refresh (Vercel cron)
 */

import { NextResponse } from "next/server";
import { verifyCronRequest } from "@/lib/infrastructure/auth/cron-auth";
import { cronAuthFailureResponse } from "@/lib/infrastructure/auth/cron-response";
import { revalidateNewsroomCaches } from "@/lib/infrastructure/cache/isr";
import { noStoreHeaders } from "@/lib/infrastructure/cache/edge";
import {
  finalizeCronRun,
  instrumentCronStart,
} from "@/lib/observability/cron-instrumentation";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function GET(request: Request) {
  return handleRevalidate(request);
}

export async function POST(request: Request) {
  return handleRevalidate(request);
}

async function handleRevalidate(request: Request) {
  const { startedAt, requestId } = instrumentCronStart("revalidate", request);
  const auth = await verifyCronRequest(request, { capability: "pipeline" });
  if (!auth.authorized) {
    return cronAuthFailureResponse(auth);
  }

  // Optional hint from Edge workers: { publishedStories: n } also refreshes the story layout.
  const hint = (await request.json().catch(() => ({}))) as { publishedStories?: unknown };
  const publishedStories = Number.isFinite(Number(hint?.publishedStories)) ? Math.max(0, Number(hint.publishedStories)) : 0;

  try {
    await revalidateNewsroomCaches(publishedStories > 0 ? { publishedStories } : undefined);
    await finalizeCronRun({
      job: "revalidate",
      startedAt,
      requestId,
      ok: true,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "revalidate_failed";
    await finalizeCronRun({
      job: "revalidate",
      startedAt,
      requestId,
      ok: false,
      error: message,
      err,
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
