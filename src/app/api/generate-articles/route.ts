import { NextRequest, NextResponse } from "next/server";
import { generateEditorialsFromEvents } from "@/lib/news/ai/generate-article";
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
 * POST /api/generate-articles — batch editorial generation from news_events
 * Requires CRON_SECRET + OPENAI_API_KEY. Does not enable homepage cutover.
 */
export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.OPENAI_API_KEY?.trim()) {
    return NextResponse.json(
      { ok: false, message: "OPENAI_API_KEY not set" },
      { status: 503 }
    );
  }

  let limit = 6;
  try {
    const body = (await request.json()) as { limit?: number };
    if (typeof body.limit === "number" && body.limit > 0 && body.limit <= 15) {
      limit = body.limit;
    }
  } catch {
    /* default limit */
  }

  const result = await generateEditorialsFromEvents({ limit });

  const imageQueue =
    result.generated > 0
      ? await processEditorialImageQueue(Math.min(result.generated, 5))
      : null;

  return NextResponse.json({
    ok: true,
    generated: result.generated,
    rejected: result.rejected,
    skipped: result.skipped,
    errors: result.errors.slice(0, 20),
    results: result.results,
    editorial_images: imageQueue,
  });
}
