import { NextRequest, NextResponse } from "next/server";
import { verifyCronRequest } from "@/lib/infrastructure/auth/cron-auth";
import { cronAuthFailureResponse } from "@/lib/infrastructure/auth/cron-response";
import { processEditorialImageQueue } from "@/lib/news/ai/generate-editorial-image";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * POST /api/process-editorial-images — drain editorial image queue
 */
export async function POST(request: NextRequest) {
  const auth = verifyCronRequest(request);
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

  const result = await processEditorialImageQueue(limit);

  return NextResponse.json({ ok: true, ...result });
}
