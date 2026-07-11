import { NextRequest, NextResponse } from "next/server";
import { verifyCronRequest } from "@/lib/infrastructure/auth/cron-auth";
import { cronAuthFailureResponse } from "@/lib/infrastructure/auth/cron-response";
import { generateEditorialsFromEvents } from "@/lib/news/ai/generate-article";
import { getEditorialThresholds } from "@/lib/news/ai/editorial-guards";
import { processEditorialImageQueue } from "@/lib/news/ai/generate-editorial-image";
import { EDITORIAL_LIMITS } from "@/lib/newsroom/editorial-capacity";
import {
  finalizeCronRun,
  instrumentCronStart,
} from "@/lib/observability/cron-instrumentation";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * POST /api/generate-articles — batch editorial generation from news_events
 */
export async function POST(request: NextRequest) {
  const { startedAt, requestId } = instrumentCronStart("generate-articles", request);
  const auth = await verifyCronRequest(request, { capability: "ingest" });
  if (!auth.authorized) {
    return cronAuthFailureResponse(auth);
  }

  if (!process.env.OPENAI_API_KEY?.trim()) {
    await finalizeCronRun({
      job: "generate-articles",
      startedAt,
      requestId,
      ok: false,
      error: "openai_not_configured",
      errorCode: "openai_not_configured",
    });
    return NextResponse.json(
      { ok: false, message: "OPENAI_API_KEY not set" },
      { status: 503 }
    );
  }

  let limit: number = EDITORIAL_LIMITS.defaultEditorialBatchLimit;
  try {
    const body = (await request.json()) as { limit?: number };
    if (
      typeof body.limit === "number" &&
      body.limit > 0 &&
      body.limit <= EDITORIAL_LIMITS.maxManualGenerateBatchLimit
    ) {
      limit = body.limit;
    }
  } catch {
    /* default limit */
  }

  try {
    const thresholds = getEditorialThresholds();
    const result = await generateEditorialsFromEvents({ limit });

    const imageQueue =
      result.published > 0
        ? await processEditorialImageQueue(
            Math.min(result.published, EDITORIAL_LIMITS.postGenerateImageQueueLimit)
          )
        : null;

    await finalizeCronRun({
      job: "generate-articles",
      startedAt,
      requestId,
      ok: true,
      entityCount: result.published,
      metadata: {
        generated: result.generated,
        rejected: result.rejected,
        repaired: result.repaired,
      },
    });

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
      intelligenceFields: [
        "confidence",
        "readability",
        "seoQuality",
        "localRelevance",
        "originality",
        "publishDecision",
      ],
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "generate_articles_failed";
    await finalizeCronRun({
      job: "generate-articles",
      startedAt,
      requestId,
      ok: false,
      error: message,
      err,
    });
    return NextResponse.json(
      { ok: false, message },
      { status: 500 }
    );
  }
}
