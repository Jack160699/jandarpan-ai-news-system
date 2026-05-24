/**
 * Health endpoint — provider + Supabase anon read diagnostics
 */

import { NextResponse } from "next/server";
import { edgeCacheHeaders } from "@/lib/infrastructure/cache/edge";
import { isRedisConfigured } from "@/lib/infrastructure/cache/redis";
import { INFRA_CONFIG } from "@/lib/infrastructure/config";
import { getProductionEnvChecks } from "@/lib/infrastructure/production";
import { getApiProviderHealthDashboard } from "@/lib/infrastructure/providers/api-health";
import { getProviderRegistryDashboard } from "@/lib/news/providers/circuit-breaker";
import { getAggregationMetrics } from "@/lib/news/live-feed/observability";
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
  let generatedPoolSize = 0;
  let generatedRowCount: number | null = null;
  let anonReadError: string | null = null;
  let anonReadDetails: Record<string, unknown> | null = null;
  let tableRowCount: number | null = null;

  if (providers.supabase) {
    try {
      const supabase = createAnonServerClient();

      const [legacyCount, generatedCount] = await Promise.all([
        supabase.from("news_articles").select("id", { count: "exact", head: true }),
        supabase
          .from("generated_articles")
          .select("id", { count: "exact", head: true })
          .neq("editorial_status", "rejected")
          .neq("editorial_status", "pending"),
      ]);

      tableRowCount = legacyCount.count ?? null;
      generatedRowCount = generatedCount.count ?? null;

      if (legacyCount.error) {
        anonReadError = legacyCount.error.message;
        anonReadDetails = {
          code: legacyCount.error.code,
          details: legacyCount.error.details,
          hint: legacyCount.error.hint,
        };
      }

      const { data: generatedSample, error: generatedSelectError } = await supabase
        .from("generated_articles")
        .select("id,slug,headline,published_at,editorial_status")
        .neq("editorial_status", "rejected")
        .neq("editorial_status", "pending")
        .order("published_at", { ascending: false, nullsFirst: false })
        .limit(5);

      if (generatedSelectError) {
        anonReadError = generatedSelectError.message;
        anonReadDetails = {
          code: generatedSelectError.code,
          stage: "generated_articles_select",
        };
      } else {
        generatedPoolSize = generatedSample?.length ?? 0;
        homepageReadable =
          generatedPoolSize > 0 ||
          (generatedRowCount ?? 0) > 0 ||
          (tableRowCount ?? 0) > 0;
      }

      const { data, error: selectError } = await supabase
        .from("news_articles")
        .select(CORE_ARTICLE_SELECT)
        .order("published_at", { ascending: false, nullsFirst: false })
        .limit(5);

      if (selectError && !anonReadError) {
        anonReadError = selectError.message;
        anonReadDetails = {
          code: selectError.code,
          details: selectError.details,
          hint: selectError.hint,
          stage: "news_articles_select",
        };
      } else {
        articlePoolSize = data?.length ?? 0;
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

  const [apiHealth, rssHealth, circuitRegistry] = await Promise.all([
    getApiProviderHealthDashboard().catch(() => []),
    getRssHealthDashboard().catch(() => []),
    getProviderRegistryDashboard().catch(() => []),
  ]);

  const liveFeedMetrics = getAggregationMetrics();

  const productionEnv = getProductionEnvChecks();

  const healthy =
    providers.supabase &&
    homepageReadable &&
    !anonReadError &&
    (providers.gnews || providers.newsdata || providers.rss) &&
    (generatedRowCount ?? 0) > 0;

  return NextResponse.json(
    {
      ok: healthy,
      service: "newspaper-motion",
      timestamp: new Date().toISOString(),
      deployment: {
        nodeEnv: process.env.NODE_ENV,
        vercelEnv: process.env.VERCEL_ENV ?? null,
        productionEnvReady: productionEnv.ready,
        productionWarnings: productionEnv.warnings,
      },
      infrastructure: {
        redis: isRedisConfigured(),
        homepageCacheSeconds: INFRA_CONFIG.homepageCacheSeconds,
        editorialConcurrency: INFRA_CONFIG.editorialConcurrency,
      },
      provider_health: {
        api: apiHealth,
        rss: rssHealth.slice(0, 12),
        circuit_breaker: circuitRegistry,
      },
      live_feed_metrics: liveFeedMetrics,
      providers,
      supabase_env: supabaseEnv,
      generated_articles: {
        homepage_pool_size: generatedPoolSize,
        table_row_count: generatedRowCount,
        homepage_primary: true,
      },
      news_articles: {
        legacy_pool_size: articlePoolSize,
        table_row_count: tableRowCount,
        anon_read_error: anonReadError,
        anon_read_details: anonReadDetails,
      },
      homepage_readable: homepageReadable,
    },
    {
      status: healthy ? 200 : 503,
      headers: edgeCacheHeaders({ sMaxAge: 15, private: true }),
    }
  );
}
