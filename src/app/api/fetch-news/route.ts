/**
 * App Router API: GET/POST /api/fetch-news
 *
 * Scalable ingestion — parallel providers, incremental upserts, async AI queue
 */

import { NextResponse } from "next/server";
import {
  runScalableIngestion,
  triggerAiProcessing,
} from "@/lib/news/pipeline/scalable-ingest";
import { createExecutionDeadline } from "@/lib/serverless/deadline";
import { isSupabaseConfigured } from "@/lib/supabase";

export const runtime = "nodejs";
export const maxDuration = 60;

function parseBearerToken(authorization: string | null): string | null {
  if (!authorization) return null;
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : null;
}

function checkCronAuth(request: Request): {
  authorized: boolean;
  bearerToken: string | null;
  cronHeader: string | null;
} {
  const cronSecret = process.env.CRON_SECRET?.trim() || null;
  const bearerToken = parseBearerToken(request.headers.get("authorization"));
  const cronHeader = request.headers.get("x-cron-secret")?.trim() ?? null;

  if (cronSecret) {
    if (bearerToken === cronSecret || cronHeader === cronSecret) {
      return { authorized: true, bearerToken, cronHeader };
    }
  }

  if (process.env.NODE_ENV === "development") {
    const url = new URL(request.url);
    if (url.searchParams.get("dev") === "1") {
      return { authorized: true, bearerToken, cronHeader };
    }
    if (!cronSecret) {
      return { authorized: true, bearerToken, cronHeader };
    }
  }

  return { authorized: false, bearerToken, cronHeader };
}

function hasAnyProviderConfigured(): boolean {
  return Boolean(
    process.env.GNEWS_API_KEY?.trim() ||
      process.env.NEWSDATA_API_KEY?.trim() ||
      true
  );
}

export async function GET(request: Request) {
  return handleFetchNews(request);
}

export async function POST(request: Request) {
  return handleFetchNews(request);
}

async function handleFetchNews(request: Request) {
  const startedAt = Date.now();
  const deadline = createExecutionDeadline();

  const auth = checkCronAuth(request);
  if (!auth.authorized) {
    return NextResponse.json(
      {
        ok: false,
        error: "Unauthorized",
        expectedExists: !!process.env.CRON_SECRET?.trim(),
        bearerReceived: !!auth.bearerToken,
        xCronReceived: !!auth.cronHeader,
      },
      { status: 401 }
    );
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { ok: false, error: "Supabase is not configured" },
      { status: 500 }
    );
  }

  if (!hasAnyProviderConfigured()) {
    return NextResponse.json(
      {
        ok: false,
        error: "No news providers configured (GNEWS_API_KEY or NEWSDATA_API_KEY)",
      },
      { status: 500 }
    );
  }

  try {
    console.log("[fetch-news] Scalable ingestion start…");

    const result = await runScalableIngestion(deadline);

    triggerAiProcessing(request.url);

    const homepageFeed = await import("@/lib/news-db").then((m) =>
      m.getLiveNewsFeed()
    );

    const durationMs = Date.now() - startedAt;

    console.log(
      `[fetch-news] Done: inserted=${result.inserted} queuedAI=${result.queuedForAI} timedOut=${result.timedOutSafely} duration=${durationMs}ms`
    );

    if (!result.ok && result.inserted === 0) {
      return NextResponse.json(
        {
          ok: false,
          error: "No articles ingested",
          completedProviders: result.completedProviders,
          skippedProviders: result.skippedProviders,
          errors: result.errors,
          durationMs,
          timedOutSafely: result.timedOutSafely,
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      ok: true,
      inserted: result.inserted,
      skippedDuplicates: result.skippedDuplicates,
      failedValidation: result.failedValidation,
      totalFetched: result.totalFetched,
      queuedForAI: result.queuedForAI,
      completedProviders: result.completedProviders,
      skippedProviders: result.skippedProviders,
      timedOutSafely: result.timedOutSafely,
      categoryStats: result.categoryStats,
      providerStats: result.providerStats,
      errors: result.errors,
      failures: result.failures,
      logId: result.logId,
      durationMs,
      rssSourceAnalytics: result.rssSourceAnalytics,
      healthySources: result.healthySources,
      failedSources: result.failedSources,
      articlesRecoveredByFallback: result.articlesRecoveredByFallback,
      imageAnalytics: result.imageAnalytics,
      homepageAnalytics: homepageFeed?.analytics ?? null,
      homepageHero: homepageFeed?.hero?.title ?? null,
      cacheRevalidated: true,
      scalable: true,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[fetch-news] Fatal:", message);
    return NextResponse.json(
      {
        ok: false,
        error: message,
        durationMs: Date.now() - startedAt,
        timedOutSafely: deadline.timedOutSafely,
      },
      { status: 500 }
    );
  }
}
