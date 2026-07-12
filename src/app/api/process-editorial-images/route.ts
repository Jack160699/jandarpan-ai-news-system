import { NextRequest, NextResponse } from "next/server";
import { verifyCronRequest } from "@/lib/infrastructure/auth/cron-auth";
import { cronAuthFailureResponse } from "@/lib/infrastructure/auth/cron-response";
import { processEditorialImageQueue } from "@/lib/news/ai/generate-editorial-image";
import {
  finalizeCronRun,
  instrumentCronStart,
} from "@/lib/observability/cron-instrumentation";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * POST /api/process-editorial-images — drain editorial image queue
 */
export async function POST(request: NextRequest) {
  const { startedAt, requestId } = instrumentCronStart(
    "process-editorial-images",
    request
  );
  const auth = await verifyCronRequest(request, { capability: "pipeline" });
  if (!auth.authorized) {
    return cronAuthFailureResponse(auth);
  }

  let limit = 5;
  try {
    const body = (await request.json()) as { limit?: number };
    if (typeof body.limit === "number" && body.limit > 0 && body.limit <= 10) {
      limit = body.limit;
    }
  } catch {
    /* default */
  }

  try {
    const result = await processEditorialImageQueue(limit);

    await finalizeCronRun({
      job: "process-editorial-images",
      startedAt,
      requestId,
      ok: true,
      entityCount: result.completed,
      metadata: {
        failed: result.failed,
        processed: result.processed,
      },
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "process_editorial_images_failed";
    await finalizeCronRun({
      job: "process-editorial-images",
      startedAt,
      requestId,
      ok: false,
      error: message,
      err,
    });
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
