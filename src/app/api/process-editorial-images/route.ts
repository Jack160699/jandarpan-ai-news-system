import { NextRequest, NextResponse } from "next/server";
import { processEditorialImageQueue } from "@/lib/news/ai/generate-editorial-image";

export const runtime = "nodejs";
export const maxDuration = 60;

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const auth = request.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

/**
 * POST /api/process-editorial-images — drain editorial image queue
 */
export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
