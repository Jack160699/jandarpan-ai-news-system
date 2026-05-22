/**
 * App Router API: GET/POST /api/fetch-news
 *
 * GitHub Actions driven ingestion — .github/workflows/news-cron.yml
 *
 * Hybrid pipeline:
 * 1. GNews (India categories) + NewsData.io (India/global) + RSS (CG local)
 * 2. Normalize, validate, dedupe
 * 3. Batch upsert → Supabase news_articles
 * 4. Optional AI enrichment (OPENAI_API_KEY)
 */

import { NextResponse } from "next/server";
import { processRecentArticlesWithAi } from "@/lib/news/ai/process";
import { fetchAllNewsProviders } from "@/lib/news/providers";
import { runIngestionPipeline } from "@/lib/news/pipeline/ingest";
import { isSupabaseConfigured } from "@/lib/supabase";

export const runtime = "nodejs";
export const maxDuration = 120;

function isAuthorized(request: Request): boolean {
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret) {
    const auth = request.headers.get("authorization");
    if (auth === `Bearer ${cronSecret}`) return true;
  }

  if (process.env.NODE_ENV === "development") {
    const url = new URL(request.url);
    if (url.searchParams.get("dev") === "1") return true;
    if (!cronSecret) return true;
  }

  return false;
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

  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
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
    console.log("[fetch-news] Starting hybrid ingestion…");

    const fetchResult = await fetchAllNewsProviders();

    if (!fetchResult.articles.length) {
      return NextResponse.json(
        {
          ok: false,
          error: "No articles fetched from any provider",
          providers: fetchResult.providers,
          errors: fetchResult.errors,
          durationMs: Date.now() - startedAt,
        },
        { status: 502 }
      );
    }

    const pipeline = await runIngestionPipeline(fetchResult.articles, {
      providers: fetchResult.providers.map((p) => ({
        provider: p.provider,
        fetched: p.fetched,
        valid: p.valid,
        errors: p.errors,
      })),
      fetchDurationMs: fetchResult.durationMs,
      errors: fetchResult.errors,
      rssAnalytics: fetchResult.rssAnalytics,
    });

    const ai = await processRecentArticlesWithAi();
    pipeline.aiProcessed = ai.processed;

    console.log(
      `[fetch-news] Done: inserted=${pipeline.inserted}, ai=${ai.processed}, duration=${pipeline.durationMs}ms`
    );

    return NextResponse.json({
      ok: true,
      inserted: pipeline.inserted,
      skippedDuplicates: pipeline.skippedDuplicates,
      failedValidation: pipeline.failedValidation,
      totalFetched: pipeline.totalFetched,
      aiProcessed: pipeline.aiProcessed,
      categoryStats: pipeline.categoryStats,
      providerStats: pipeline.providerStats,
      providers: fetchResult.providers,
      rssSourceAnalytics: fetchResult.rssAnalytics,
      errors: [...fetchResult.errors, ...ai.errors],
      failures: pipeline.failures,
      logId: pipeline.logId,
      durationMs: Date.now() - startedAt,
      preview: fetchResult.articles.slice(0, 3).map((a) => ({
        title: a.title,
        category: a.category,
        provider: a.provider,
        region: a.region,
      })),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[fetch-news] Fatal:", message);
    return NextResponse.json(
      { ok: false, error: message, durationMs: Date.now() - startedAt },
      { status: 500 }
    );
  }
}
