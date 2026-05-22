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
import { enrichArticleImages } from "@/lib/news/images/enrich";
import { fetchAllNewsProviders } from "@/lib/news/providers";
import { runIngestionPipeline } from "@/lib/news/pipeline/ingest";
import { revalidateLiveHomepage } from "@/lib/news/revalidate-home";
import { isSupabaseConfigured } from "@/lib/supabase";

export const runtime = "nodejs";
export const maxDuration = 120;

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

    const { articles: enrichedArticles, analytics: imageAnalytics } =
      await enrichArticleImages(fetchResult.articles);

    const pipeline = await runIngestionPipeline(enrichedArticles, {
      providers: fetchResult.providers.map((p) => ({
        provider: p.provider,
        fetched: p.fetched,
        valid: p.valid,
        errors: p.errors,
      })),
      fetchDurationMs: fetchResult.durationMs,
      errors: fetchResult.errors,
      rssAnalytics: fetchResult.rssAnalytics,
      healthySources: fetchResult.healthySources,
      failedSources: fetchResult.failedSources,
      articlesRecoveredByFallback: fetchResult.articlesRecoveredByFallback,
      imageAnalytics,
    });

    const ai = await processRecentArticlesWithAi();
    pipeline.aiProcessed = ai.processed;

    revalidateLiveHomepage();

    console.log(
      `[fetch-news] Done: inserted=${pipeline.inserted}, ai=${ai.processed}, duration=${pipeline.durationMs}ms — cache revalidated`
    );

    const homepageFeed = await import("@/lib/news-db").then((m) =>
      m.getLiveNewsFeed()
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
      healthySources: fetchResult.healthySources,
      failedSources: fetchResult.failedSources,
      articlesRecoveredByFallback: fetchResult.articlesRecoveredByFallback,
      imageAnalytics,
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
      homepageAnalytics: homepageFeed?.analytics ?? null,
      homepageHero: homepageFeed?.hero?.title ?? null,
      cacheRevalidated: true,
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
