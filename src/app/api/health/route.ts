/**
 * Health endpoint — provider + Supabase anon read diagnostics
 */

import { NextResponse } from "next/server";
import { edgeCacheHeaders } from "@/lib/infrastructure/cache/edge";
import { isRedisConfigured } from "@/lib/infrastructure/cache/redis";
import { INFRA_CONFIG } from "@/lib/infrastructure/config";
import { getApiProviderHealthDashboard } from "@/lib/infrastructure/providers/api-health";
import { getRssHealthDashboard } from "@/lib/news/rss-health";
import {
  CORE_ARTICLE_SELECT,
  createAnonServerClient,
  getSupabaseEnvDiagnostics,
  isSupabaseConfigured,
} from "@/lib/supabase";

export const runtime = "nodejs";

export async function GET() {
  const supabaseEnv = getSupabaseEnvDiagnostics();

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
  let anonReadDetails: Record<string, unknown> | null = null;
  let tableRowCount: number | null = null;

  if (providers.supabase) {
    try {
      const supabase = createAnonServerClient();

      const { count, error: countError } = await supabase
        .from("news_articles")
        .select("id", { count: "exact", head: true });

      tableRowCount = count ?? null;

      if (countError) {
        anonReadError = countError.message;
        anonReadDetails = {
          code: countError.code,
          details: countError.details,
          hint: countError.hint,
        };
      }

      const { data, error: selectError } = await supabase
        .from("news_articles")
        .select(CORE_ARTICLE_SELECT)
        .order("published_at", { ascending: false, nullsFirst: false })
        .limit(5);

      if (selectError) {
        anonReadError = selectError.message;
        anonReadDetails = {
          code: selectError.code,
          details: selectError.details,
          hint: selectError.hint,
          stage: "select",
        };
      } else {
        articlePoolSize = data?.length ?? 0;
        homepageReadable = articlePoolSize > 0 || (tableRowCount ?? 0) > 0;

        if ((tableRowCount ?? 0) > 0 && articlePoolSize === 0) {
          anonReadError =
            "rows_exist_but_select_empty — check RLS SELECT on news_articles for anon";
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "fetch_failed";
      anonReadError = message;
      anonReadDetails = {
        cause:
          err instanceof Error && err.cause
            ? String(err.cause)
            : undefined,
        stack: err instanceof Error ? err.stack?.split("\n").slice(0, 3) : undefined,
      };
      console.error("[health] anon Supabase test failed:", err);
    }
  } else {
    anonReadError = "supabase_not_configured_or_invalid_url";
  }

  console.log("[health] Supabase diagnostics", {
    env: supabaseEnv,
    tableRowCount,
    articlePoolSize,
    anonReadError,
  });

  const [apiHealth, rssHealth] = await Promise.all([
    getApiProviderHealthDashboard().catch(() => []),
    getRssHealthDashboard().catch(() => []),
  ]);

  const healthy =
    providers.supabase &&
    homepageReadable &&
    !anonReadError &&
    (providers.gnews || providers.newsdata || providers.rss);

  return NextResponse.json(
    {
      ok: healthy,
      service: "newspaper-motion",
      timestamp: new Date().toISOString(),
      infrastructure: {
        redis: isRedisConfigured(),
        homepageCacheSeconds: INFRA_CONFIG.homepageCacheSeconds,
        editorialConcurrency: INFRA_CONFIG.editorialConcurrency,
      },
      provider_health: {
        api: apiHealth,
        rss: rssHealth.slice(0, 12),
      },
      providers,
      supabase_env: supabaseEnv,
      news_articles: {
        homepage_pool_size: articlePoolSize,
        homepage_readable: homepageReadable,
        table_row_count: tableRowCount,
        anon_read_error: anonReadError,
        anon_read_details: anonReadDetails,
        table: "news_articles",
        client: "createAnonServerClient",
        env_keys: {
          url: "NEXT_PUBLIC_SUPABASE_URL",
          anon: "NEXT_PUBLIC_SUPABASE_ANON_KEY",
        },
      },
    },
    {
      status: healthy ? 200 : 503,
      headers: edgeCacheHeaders({ sMaxAge: 15, private: true }),
    }
  );
}
