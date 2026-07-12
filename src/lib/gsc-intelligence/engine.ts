/**
 * GSC Intelligence — sync orchestrator
 */

import {
  GSC_COMPARISON_DAYS,
  GSC_LOOKBACK_DAYS,
  GSC_PAGE_ROW_LIMIT,
  GSC_QUERY_ROW_LIMIT,
  hasGscCredentialsConfigured,
  isGscEngineEnabled,
} from "@/lib/gsc-intelligence/config";
import { loadArticleLinkHints } from "@/lib/gsc-intelligence/article-linker";
import { collectDailyMetrics } from "@/lib/gsc-intelligence/site-performance";
import { collectQueryIntelligence } from "@/lib/gsc-intelligence/query-intelligence";
import { collectPagePerformance } from "@/lib/gsc-intelligence/page-performance";
import { collectIndexHealth } from "@/lib/gsc-intelligence/index-coverage";
import { detectCtrOpportunities } from "@/lib/gsc-intelligence/ctr-opportunities";
import { detectPositionOpportunities } from "@/lib/gsc-intelligence/position-opportunities";
import { logGsc, errorGsc } from "@/lib/gsc-intelligence/logger";
import {
  clearOpenRecommendations,
  insertIndexHealth,
  insertRecommendations,
  upsertDailyMetrics,
  upsertPages,
  upsertQueries,
} from "@/lib/gsc-intelligence/repository";
import type { GscEngineResult } from "@/lib/gsc-intelligence/types";
import { isSupabaseConfigured } from "@/lib/supabase";

export async function runGscEngine(now = new Date()): Promise<GscEngineResult> {
  const startedAt = Date.now();

  if (!isGscEngineEnabled()) {
    return {
      ok: true,
      status: "skipped",
      durationMs: Date.now() - startedAt,
      dailyMetricsSaved: 0,
      queriesUpdated: 0,
      pagesUpdated: 0,
      recommendationsGenerated: 0,
      errors: [],
      skippedReason: "SEO_GSC_ENGINE_not_enabled",
    };
  }

  if (!isSupabaseConfigured()) {
    return {
      ok: false,
      status: "failed",
      durationMs: Date.now() - startedAt,
      dailyMetricsSaved: 0,
      queriesUpdated: 0,
      pagesUpdated: 0,
      recommendationsGenerated: 0,
      errors: ["supabase_not_configured"],
    };
  }

  if (!hasGscCredentialsConfigured()) {
    return {
      ok: true,
      status: "skipped",
      durationMs: Date.now() - startedAt,
      dailyMetricsSaved: 0,
      queriesUpdated: 0,
      pagesUpdated: 0,
      recommendationsGenerated: 0,
      errors: [],
      skippedReason: "gsc_credentials_not_configured",
    };
  }

  logGsc("sync_started", { ts: now.toISOString() });
  const errors: string[] = [];

  try {
    const articles = await loadArticleLinkHints();

    const dailyMetrics = await collectDailyMetrics(GSC_LOOKBACK_DAYS, now);
    const dailyMetricsSaved = await upsertDailyMetrics(dailyMetrics);

    const queries = await collectQueryIntelligence(
      GSC_COMPARISON_DAYS,
      GSC_QUERY_ROW_LIMIT,
      articles,
      now
    );
    const queriesUpdated = await upsertQueries(queries);
    logGsc("queries_updated", { count: queriesUpdated });

    const pages = await collectPagePerformance(
      GSC_COMPARISON_DAYS,
      GSC_PAGE_ROW_LIMIT,
      articles,
      now
    );
    const pagesUpdated = await upsertPages(pages);
    logGsc("pages_updated", { count: pagesUpdated });

    const indexedEstimate = pages.filter((p) => p.impressions > 0).length;
    const indexHealth = await collectIndexHealth(indexedEstimate);
    await insertIndexHealth(indexHealth);
    logGsc("index_health_captured", {
      indexed: indexHealth.indexed_pages,
      sitemap: indexHealth.sitemap_health,
    });

    await clearOpenRecommendations();
    const ctrRecs = detectCtrOpportunities(queries, pages);
    const positionRecs = detectPositionOpportunities(queries);
    const recommendationsGenerated = await insertRecommendations([
      ...ctrRecs,
      ...positionRecs,
    ]);
    logGsc("recommendations_generated", { count: recommendationsGenerated });

    logGsc("sync_completed", {
      durationMs: Date.now() - startedAt,
      dailyMetricsSaved,
      queriesUpdated,
      pagesUpdated,
    });

    return {
      ok: true,
      status: "completed",
      durationMs: Date.now() - startedAt,
      dailyMetricsSaved,
      queriesUpdated,
      pagesUpdated,
      recommendationsGenerated,
      errors,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "gsc_sync_failed";
    errorGsc("sync_completed", { error: msg });
    return {
      ok: false,
      status: "failed",
      durationMs: Date.now() - startedAt,
      dailyMetricsSaved: 0,
      queriesUpdated: 0,
      pagesUpdated: 0,
      recommendationsGenerated: 0,
      errors: [...errors, msg],
    };
  }
}
