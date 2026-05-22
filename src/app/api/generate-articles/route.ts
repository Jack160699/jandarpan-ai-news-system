import { NextRequest, NextResponse } from "next/server";
import { generateEditorialsFromEvents } from "@/lib/news/ai/generate-article";
import { getEditorialThresholds } from "@/lib/news/ai/editorial-guards";
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

  const thresholds = getEditorialThresholds();
  const result = await generateEditorialsFromEvents({ limit });

  const imageQueue =
    result.published > 0
      ? await processEditorialImageQueue(Math.min(result.published, 5))
      : null;

  return NextResponse.json({
    ok: true,
    generated: result.generated,
    rejected: result.rejected,
    published: result.published,
    repaired: result.repaired,
    skipped: result.skipped,
    avgConfidence: result.avgConfidence,
    topStory: result.topStory,
    thresholds: {
      minConfidence: thresholds.minConfidence,
      strictMode: thresholds.strictMode,
    },
    errors: result.errors.slice(0, 20),
    results: result.results,
    editorial_images: imageQueue,
  });
}
