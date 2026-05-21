/**
 * POST/GET /api/fetch-news
 *
 * Ingestion pipeline:
 * 1. NewsAPI → headlines per category
 * 2. Normalize & validate
 * 3. Upsert into Supabase `news_articles` (dedupe on article_url)
 *
 * Triggered manually or by Vercel Cron every 30 minutes.
 */

import { NextResponse } from "next/server";
import { fetchAllCategoryHeadlines } from "@/lib/fetchNews";
import { createAdminClient, isSupabaseConfigured } from "@/lib/supabase";

export const runtime = "nodejs";
export const maxDuration = 60;

function isAuthorized(request: Request): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = request.headers.get("authorization");
    if (auth === `Bearer ${cronSecret}`) return true;
  }

  // Allow manual dev trigger with optional secret query in development
  if (process.env.NODE_ENV === "development") {
    const url = new URL(request.url);
    if (url.searchParams.get("dev") === "1") return true;
  }

  // Vercel Cron sends this header when CRON_SECRET is configured
  const vercelCron = request.headers.get("x-vercel-cron");
  if (vercelCron === "1" && process.env.VERCEL === "1") {
    return true;
  }

  return !cronSecret && process.env.NODE_ENV === "development";
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

  if (!process.env.NEWS_API_KEY) {
    return NextResponse.json(
      { ok: false, error: "NEWS_API_KEY is not configured" },
      { status: 500 }
    );
  }

  try {
    console.log("[fetch-news] Starting ingestion…");
    const fetchResult = await fetchAllCategoryHeadlines();

    if (!fetchResult.articles.length) {
      return NextResponse.json(
        {
          ok: false,
          error: "No articles fetched from NewsAPI",
          categories: fetchResult.categories,
          errors: fetchResult.errors,
          durationMs: Date.now() - startedAt,
        },
        { status: 502 }
      );
    }

    const supabase = createAdminClient();
    const rows = fetchResult.articles;

    const { data, error } = await supabase
      .from("news_articles")
      .upsert(rows, {
        onConflict: "article_url",
        ignoreDuplicates: true,
      })
      .select("id");

    if (error) {
      console.error("[fetch-news] Supabase upsert error:", error.message);
      return NextResponse.json(
        {
          ok: false,
          error: error.message,
          fetched: fetchResult.articles.length,
          durationMs: Date.now() - startedAt,
        },
        { status: 500 }
      );
    }

    const insertedCount = data?.length ?? 0;
    const skipped = fetchResult.articles.length - insertedCount;

    console.log(
      `[fetch-news] Done: ${insertedCount} new, ${skipped} duplicates skipped, ${fetchResult.errors.length} category errors`
    );

    return NextResponse.json({
      ok: true,
      inserted: insertedCount,
      skippedDuplicates: skipped,
      totalFetched: fetchResult.articles.length,
      categories: fetchResult.categories,
      errors: fetchResult.errors,
      durationMs: Date.now() - startedAt,
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
