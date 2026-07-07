import { NextRequest, NextResponse } from "next/server";
import { verifyCronRequest } from "@/lib/infrastructure/auth/cron-auth";
import { cronAuthFailureResponse } from "@/lib/infrastructure/auth/cron-response";
import { legacyCronApiHeaders } from "@/lib/infrastructure/auth/legacy-cron-headers";
import { processEditorialImageQueue } from "@/lib/news/ai/generate-editorial-image";

export const runtime = "nodejs";
export const maxDuration = 60;

const SUCCESSOR = "/api/cron/orchestrate";

/**
 * POST /api/process-editorial-images — legacy editorial image queue drain.
 * @deprecated Use orchestrate worker `editorial_images` via POST /api/cron/orchestrate
 */
export async function POST(request: NextRequest) {
  const auth = await verifyCronRequest(request);
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

  return NextResponse.json(
    { ok: true, deprecated: true, successor: SUCCESSOR, ...result },
    { headers: legacyCronApiHeaders(SUCCESSOR) }
  );
}
