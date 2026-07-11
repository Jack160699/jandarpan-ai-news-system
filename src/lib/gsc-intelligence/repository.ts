/**
 * GSC Intelligence — Supabase persistence + dashboard
 */

import { createAdminServerClient, isSupabaseConfigured } from "@/lib/supabase";
import { aggregateSiteTotals } from "@/lib/gsc-intelligence/site-performance";
import {
  buildCategoryTrends,
  buildDistrictTrends,
  buildTrendPeriod,
} from "@/lib/gsc-intelligence/trend-analysis";
import { buildExecutiveReport } from "@/lib/gsc-intelligence/executive-report";
import type {
  GscDailyMetricRecord,
  GscDashboard,
  GscIndexHealthRecord,
  GscPageRecord,
  GscQueryRecord,
  GscRecommendationRecord,
} from "@/lib/gsc-intelligence/types";

type GscTable =
  | "gsc_daily_metrics"
  | "gsc_queries"
  | "gsc_pages"
  | "gsc_index_health"
  | "gsc_recommendations";

function fromGsc(table: GscTable) {
  return createAdminServerClient().from(table as never);
}

export async function upsertDailyMetrics(
  records: GscDailyMetricRecord[]
): Promise<number> {
  if (records.length === 0) return 0;
  let saved = 0;

  for (const record of records) {
    const { error } = await fromGsc("gsc_daily_metrics").upsert(
      {
        metric_date: record.metric_date,
        clicks: record.clicks,
        impressions: record.impressions,
        ctr: record.ctr,
        position: record.position,
        updated_at: new Date().toISOString(),
      } as never,
      { onConflict: "metric_date" }
    );
    if (!error) saved += 1;
  }

  return saved;
}

export async function upsertQueries(records: GscQueryRecord[]): Promise<number> {
  if (records.length === 0) return 0;
  let saved = 0;

  for (const record of records.slice(0, 500)) {
    const { error } = await fromGsc("gsc_queries").upsert(
      {
        query: record.query,
        clicks: record.clicks,
        impressions: record.impressions,
        ctr: record.ctr,
        position: record.position,
        previous_position: record.previous_position ?? null,
        position_delta: record.position_delta ?? null,
        trend: record.trend,
        district: record.district ?? null,
        category: record.category ?? null,
        generated_article_id: record.generated_article_id ?? null,
        generated_article_slug: record.generated_article_slug ?? null,
        topic: record.topic ?? null,
        period_start: record.period_start ?? null,
        period_end: record.period_end ?? null,
        last_seen: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as never,
      { onConflict: "query" }
    );
    if (!error) saved += 1;
  }

  return saved;
}

export async function upsertPages(records: GscPageRecord[]): Promise<number> {
  if (records.length === 0) return 0;
  let saved = 0;

  for (const record of records.slice(0, 500)) {
    const { error } = await fromGsc("gsc_pages").upsert(
      {
        page_url: record.page_url,
        clicks: record.clicks,
        impressions: record.impressions,
        ctr: record.ctr,
        position: record.position,
        indexed_status: record.indexed_status,
        generated_article_id: record.generated_article_id ?? null,
        generated_article_slug: record.generated_article_slug ?? null,
        district: record.district ?? null,
        category: record.category ?? null,
        period_start: record.period_start ?? null,
        period_end: record.period_end ?? null,
        last_seen: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as never,
      { onConflict: "page_url" }
    );
    if (!error) saved += 1;
  }

  return saved;
}

export async function insertIndexHealth(
  record: GscIndexHealthRecord
): Promise<void> {
  const { error } = await fromGsc("gsc_index_health").insert({
    captured_at: new Date().toISOString(),
    indexed_pages: record.indexed_pages,
    excluded_pages: record.excluded_pages,
    errors: record.errors,
    warnings: record.warnings,
    sitemap_health: record.sitemap_health,
    news_sitemap_health: record.news_sitemap_health,
    canonical_issues: record.canonical_issues,
    robots_issues: record.robots_issues,
    raw_metadata: record.raw_metadata ?? {},
  } as never);

  if (error) throw new Error(error.message);
}

export async function clearOpenRecommendations(): Promise<void> {
  await fromGsc("gsc_recommendations").delete().eq("status", "open");
}

export async function insertRecommendations(
  records: GscRecommendationRecord[]
): Promise<number> {
  if (records.length === 0) return 0;
  const batch = records.slice(0, 150).map((r) => ({
    recommendation_type: r.recommendation_type,
    priority: r.priority,
    title: r.title,
    reason: r.reason,
    query: r.query ?? null,
    page_url: r.page_url ?? null,
    scores: r.scores ?? {},
    status: "open",
    metadata: r.metadata ?? {},
  }));

  const { error } = await fromGsc("gsc_recommendations").insert(batch as never);
  if (error) throw new Error(error.message);
  return batch.length;
}

function mapQuery(row: Record<string, unknown>): GscQueryRecord {
  return {
    query: String(row.query),
    clicks: Number(row.clicks),
    impressions: Number(row.impressions),
    ctr: Number(row.ctr),
    position: Number(row.position),
    previous_position: (row.previous_position as number | null) ?? null,
    position_delta: (row.position_delta as number | null) ?? null,
    trend: row.trend as GscQueryRecord["trend"],
    district: (row.district as string | null) ?? null,
    category: (row.category as string | null) ?? null,
    generated_article_id: (row.generated_article_id as string | null) ?? null,
    generated_article_slug: (row.generated_article_slug as string | null) ?? null,
    topic: (row.topic as string | null) ?? null,
    period_start: (row.period_start as string | null) ?? null,
    period_end: (row.period_end as string | null) ?? null,
  };
}

function mapPage(row: Record<string, unknown>): GscPageRecord {
  return {
    page_url: String(row.page_url),
    clicks: Number(row.clicks),
    impressions: Number(row.impressions),
    ctr: Number(row.ctr),
    position: Number(row.position),
    indexed_status: row.indexed_status as GscPageRecord["indexed_status"],
    generated_article_id: (row.generated_article_id as string | null) ?? null,
    generated_article_slug: (row.generated_article_slug as string | null) ?? null,
    district: (row.district as string | null) ?? null,
    category: (row.category as string | null) ?? null,
    period_start: (row.period_start as string | null) ?? null,
    period_end: (row.period_end as string | null) ?? null,
  };
}

export async function getGscDashboard(): Promise<GscDashboard> {
  if (!isSupabaseConfigured()) return emptyDashboard();

  const [metricsRes, queriesRes, pagesRes, healthRes, recsRes] =
    await Promise.all([
      fromGsc("gsc_daily_metrics")
        .select("*")
        .order("metric_date", { ascending: true })
        .limit(90),
      fromGsc("gsc_queries")
        .select("*")
        .order("clicks", { ascending: false })
        .limit(50),
      fromGsc("gsc_pages")
        .select("*")
        .order("clicks", { ascending: false })
        .limit(50),
      fromGsc("gsc_index_health")
        .select("*")
        .order("captured_at", { ascending: false })
        .limit(1),
      fromGsc("gsc_recommendations")
        .select("*")
        .eq("status", "open")
        .order("priority")
        .limit(30),
    ]);

  const growthCharts = (metricsRes.data ?? []).map((row) => {
    const r = row as Record<string, unknown>;
    return {
      metric_date: String(r.metric_date),
      clicks: Number(r.clicks),
      impressions: Number(r.impressions),
      ctr: Number(r.ctr),
      position: Number(r.position),
    };
  });

  const topQueries = (queriesRes.data ?? []).map((row) =>
    mapQuery(row as Record<string, unknown>)
  );
  const topPages = (pagesRes.data ?? []).map((row) =>
    mapPage(row as Record<string, unknown>)
  );

  const totals28 = aggregateSiteTotals(growthCharts, 28);
  const healthRow = (healthRes.data?.[0] as Record<string, unknown> | undefined) ?? null;

  const indexHealth: GscIndexHealthRecord | null = healthRow
    ? {
        indexed_pages: Number(healthRow.indexed_pages),
        excluded_pages: Number(healthRow.excluded_pages),
        errors: Number(healthRow.errors),
        warnings: Number(healthRow.warnings),
        sitemap_health: healthRow.sitemap_health as GscIndexHealthRecord["sitemap_health"],
        news_sitemap_health:
          healthRow.news_sitemap_health as GscIndexHealthRecord["news_sitemap_health"],
        canonical_issues: Number(healthRow.canonical_issues),
        robots_issues: Number(healthRow.robots_issues),
        raw_metadata: (healthRow.raw_metadata as Record<string, unknown>) ?? {},
      }
    : null;

  const ctrOpportunities = (recsRes.data ?? []).map((row) => {
    const r = row as Record<string, unknown>;
    return {
      recommendation_type: r.recommendation_type,
      priority: r.priority,
      title: String(r.title),
      reason: String(r.reason),
      query: (r.query as string | null) ?? null,
      page_url: (r.page_url as string | null) ?? null,
      scores: (r.scores as Record<string, number>) ?? {},
      metadata: (r.metadata as Record<string, unknown>) ?? {},
    } as GscRecommendationRecord;
  });

  const lastSyncAt =
    healthRow?.captured_at != null
      ? String(healthRow.captured_at)
      : growthCharts.length > 0
        ? growthCharts[growthCharts.length - 1].metric_date
        : null;

  return {
    clicks: totals28.clicks,
    impressions: totals28.impressions,
    ctr: totals28.ctr,
    averagePosition: totals28.position,
    periodDays: 28,
    lastSyncAt,
    topQueries,
    topPages,
    indexHealth,
    ctrOpportunities,
    growthCharts,
    trends: {
      days7: buildTrendPeriod(growthCharts, 7, "7 days"),
      days30: buildTrendPeriod(growthCharts, 30, "30 days"),
      days90: buildTrendPeriod(growthCharts, 90, "90 days"),
    },
    executiveReport: buildExecutiveReport(topQueries, topPages),
    districtTrends: buildDistrictTrends(topQueries),
    categoryTrends: buildCategoryTrends(topQueries),
  };
}

function emptyDashboard(): GscDashboard {
  return {
    clicks: 0,
    impressions: 0,
    ctr: 0,
    averagePosition: 0,
    periodDays: 28,
    lastSyncAt: null,
    topQueries: [],
    topPages: [],
    indexHealth: null,
    ctrOpportunities: [],
    growthCharts: [],
    trends: {
      days7: {
        days: 7,
        label: "7 days",
        clicks: 0,
        impressions: 0,
        ctr: 0,
        position: 0,
        clicks_delta: 0,
        impressions_delta: 0,
      },
      days30: {
        days: 30,
        label: "30 days",
        clicks: 0,
        impressions: 0,
        ctr: 0,
        position: 0,
        clicks_delta: 0,
        impressions_delta: 0,
      },
      days90: {
        days: 90,
        label: "90 days",
        clicks: 0,
        impressions: 0,
        ctr: 0,
        position: 0,
        clicks_delta: 0,
        impressions_delta: 0,
      },
    },
    executiveReport: {
      topWinners: [],
      topLosers: [],
      fastestGrowingKeywords: [],
      fastestDecliningKeywords: [],
      mostClickedArticles: [],
      highestCtr: [],
      lowestCtr: [],
    },
    districtTrends: [],
    categoryTrends: [],
  };
}

export async function listQueries(limit = 50): Promise<GscQueryRecord[]> {
  if (!isSupabaseConfigured()) return [];
  const { data } = await fromGsc("gsc_queries")
    .select("*")
    .order("clicks", { ascending: false })
    .limit(limit);
  return (data ?? []).map((row) => mapQuery(row as Record<string, unknown>));
}

export async function listPages(limit = 50): Promise<GscPageRecord[]> {
  if (!isSupabaseConfigured()) return [];
  const { data } = await fromGsc("gsc_pages")
    .select("*")
    .order("clicks", { ascending: false })
    .limit(limit);
  return (data ?? []).map((row) => mapPage(row as Record<string, unknown>));
}
