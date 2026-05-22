/**
 * Health endpoint for GitHub Actions / monitoring
 */

import { NextResponse } from "next/server";
import { fetchArticlePool } from "@/lib/news-db";
import { createServerAnonClient, isSupabaseConfigured } from "@/lib/supabase";

export const runtime = "nodejs";

export async function GET() {
  const providers = {
    gnews: Boolean(process.env.GNEWS_API_KEY?.trim()),
    newsdata: Boolean(process.env.NEWSDATA_API_KEY?.trim()),
    rss: true,
    openai: Boolean(process.env.OPENAI_API_KEY?.trim()),
    supabase: isSupabaseConfigured(),
    cronSecret: Boolean(process.env.CRON_SECRET?.trim()),
  };

  let homepageReadable = false;
  let articlePoolSize = 0;
  let anonReadError: string | null = null;

  if (providers.supabase) {
    try {
      const pool = await fetchArticlePool();
      articlePoolSize = pool.length;
      homepageReadable = pool.length > 0;
    } catch (err) {
      anonReadError = err instanceof Error ? err.message : "fetch_failed";
    }

    if (!homepageReadable && !anonReadError) {
      try {
        const supabase = createServerAnonClient();
        const { count, error } = await supabase
          .from("news_articles")
          .select("id", { count: "exact", head: true });
        if (error) anonReadError = error.message;
        else if ((count ?? 0) > 0) {
          anonReadError =
            "rows_exist_but_pool_empty — check RLS SELECT policy for anon on news_articles";
        }
      } catch (err) {
        anonReadError =
          err instanceof Error ? err.message : "anon_count_failed";
      }
    }
  }

  const healthy =
    providers.supabase &&
    homepageReadable &&
    (providers.gnews || providers.newsdata || providers.rss);

  return NextResponse.json(
    {
      ok: healthy,
      service: "newspaper-motion",
      timestamp: new Date().toISOString(),
      providers,
      news_articles: {
        homepage_pool_size: articlePoolSize,
        homepage_readable: homepageReadable,
        anon_read_error: anonReadError,
        table: "news_articles",
      },
    },
    { status: healthy ? 200 : 503 }
  );
}
