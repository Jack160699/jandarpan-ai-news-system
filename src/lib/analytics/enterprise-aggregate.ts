/**
 * Enterprise analytics — extends base reader report with desk, SEO, geo, productivity
 */

import { buildNewsroomAnalyticsReport } from "@/lib/analytics/aggregate";
import { rankArticles } from "@/lib/analytics/article-ranking";
import { buildAdminInsights } from "@/lib/analytics/admin-insights";
import { listScheduledReports } from "@/lib/analytics/scheduled-reports";
import { createAdminServerClient, isSupabaseConfigured } from "@/lib/supabase";
import type {
  AiConfidenceTrendPoint,
  AudienceRetentionPoint,
  CtrAnalytics,
  DistrictEngagementRow,
  EnterpriseAnalyticsReport,
  LiveReadersSnapshot,
  NewsroomProductivity,
  PublishingVelocityPoint,
  ScrollDepthBucket,
  SeoRankingRow,
  SourcePerformanceRow,
} from "@/lib/analytics/types";

const ACTIVE_WINDOW_MS = 5 * 60 * 1000;

export async function buildEnterpriseAnalyticsReport(
  tenantId: string,
  windowHours = 168
): Promise<EnterpriseAnalyticsReport> {
  const base = await buildNewsroomAnalyticsReport(tenantId, windowHours);

  if (!isSupabaseConfigured()) {
    return extendEmpty(base);
  }

  const since = new Date(Date.now() - windowHours * 3600_000).toISOString();
  const fiveMinAgo = new Date(Date.now() - ACTIVE_WINDOW_MS).toISOString();
  const supabase = createAdminServerClient();

  const [eventsRes, events5mRes, articlesRes, workflowRes, schedules] =
    await Promise.all([
      supabase
        .from("reader_analytics_events")
        .select(
          "event_type, article_slug, session_hash, surface, value_num, created_at, region"
        )
        .eq("tenant_id", tenantId)
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(8000),
      supabase
        .from("reader_analytics_events")
        .select("session_hash, event_type, created_at")
        .eq("tenant_id", tenantId)
        .gte("created_at", fiveMinAgo),
      supabase
        .from("generated_articles")
        .select(
          "slug, headline, summary, seo_title, seo_description, published_at, created_at, editorial_status, editorial_metadata, geo_metadata, tags"
        )
        .eq("tenant_id", tenantId)
        .gte("created_at", since)
        .limit(200),
      supabase
        .from("editorial_workflow_events")
        .select("event_type, created_at, article_id")
        .eq("tenant_id", tenantId)
        .gte("created_at", since)
        .limit(500),
      listScheduledReports(tenantId),
    ]);

  const events = eventsRes.data ?? [];
  const events5m = events5mRes.data ?? [];
  const articles = articlesRes.data ?? [];
  const workflowEvents = workflowRes.data ?? [];

  const liveReaders = buildLiveReaders(events5m, events);
  const velocityMap = new Map(
    base.breakingVelocity.map((b) => [b.slug, b.velocityScore])
  );
  const rankedArticles = rankArticles(base.topArticles, velocityMap);

  const districtEngagement = buildDistrictEngagement(base.topArticles);
  const seoRankings = buildSeoRankings(articles, events, base.topArticles);
  const ctrAnalytics = buildCtrAnalytics(events, base.topArticles);
  const audienceRetention = buildAudienceRetention(events, windowHours);
  const scrollDepth = buildScrollDepthBuckets(events);
  const sourcePerformance = buildSourcePerformance(articles, base.topArticles);
  const productivity = buildProductivity(articles, workflowEvents);
  const publishingVelocity = buildPublishingVelocity(articles, windowHours);
  const aiConfidenceTrend = buildAiConfidenceTrend(articles, windowHours);

  const draft: EnterpriseAnalyticsReport = {
    ...base,
    liveReaders,
    rankedArticles,
    districtEngagement,
    seoRankings,
    ctrAnalytics,
    audienceRetention,
    scrollDepth,
    sourcePerformance,
    productivity,
    publishingVelocity,
    aiConfidenceTrend,
    geographicAnalytics: base.regionalHeatmap,
    scheduledReports: schedules,
    adminInsights: [],
  };

  draft.adminInsights = buildAdminInsights(draft);
  return draft;
}

function buildLiveReaders(
  events5m: Array<{ session_hash: string | null; event_type: string }>,
  events24h: Array<{ session_hash: string | null; created_at: string }>
): LiveReadersSnapshot {
  const sessions5m = new Set(
    events5m.map((e) => e.session_hash).filter(Boolean)
  );
  const oneDayAgo = Date.now() - 24 * 3600_000;
  const sessions24h = new Set<string>();
  let peak5m = 0;
  const bucketMs = 5 * 60 * 1000;
  const buckets = new Map<number, Set<string>>();

  for (const e of events24h) {
    if (!e.session_hash) continue;
    sessions24h.add(e.session_hash);
    const t = new Date(e.created_at).getTime();
    if (t < oneDayAgo) continue;
    const bucket = Math.floor(t / bucketMs);
    const set = buckets.get(bucket) ?? new Set();
    set.add(e.session_hash);
    buckets.set(bucket, set);
    if (set.size > peak5m) peak5m = set.size;
  }

  const views5m = events5m.filter((e) => e.event_type === "article_view").length;

  return {
    activeReaders: sessions5m.size,
    activeSessions5m: sessions5m.size,
    peakReaders24h: peak5m,
    viewsPerMinute: Math.round((views5m / 5) * 10) / 10,
  };
}

function buildDistrictEngagement(
  articles: EnterpriseAnalyticsReport["topArticles"]
): DistrictEngagementRow[] {
  const map = new Map<string, DistrictEngagementRow>();

  for (const a of articles) {
    const district = a.region ?? "National";
    const prev = map.get(district) ?? {
      district,
      views: 0,
      clicks: 0,
      ctr: 0,
      articles: 0,
      engagementScore: 0,
    };
    prev.views += a.views;
    prev.clicks += a.clicks;
    prev.articles += 1;
    prev.engagementScore += a.engagementScore;
    map.set(district, prev);
  }

  return [...map.values()]
    .map((d) => ({
      ...d,
      ctr: d.views ? d.clicks / d.views : 0,
      engagementScore: d.articles
        ? Math.round(d.engagementScore / d.articles)
        : 0,
    }))
    .sort((a, b) => b.views - a.views)
    .slice(0, 16);
}

function buildSeoRankings(
  articles: Array<{
    slug: string;
    headline: string;
    seo_title: string | null;
    seo_description: string | null;
    summary: string | null;
  }>,
  events: Array<{ event_type: string; article_slug: string | null }>,
  perf: EnterpriseAnalyticsReport["topArticles"]
): SeoRankingRow[] {
  const searchClicks = new Map<string, number>();
  for (const e of events) {
    if (e.event_type !== "search_click" || !e.article_slug) continue;
    searchClicks.set(
      e.article_slug,
      (searchClicks.get(e.article_slug) ?? 0) + 1
    );
  }

  return articles
    .map((a) => {
      const p = perf.find((x) => x.slug === a.slug);
      const hasTitle = Boolean(a.seo_title?.trim());
      const hasDesc = Boolean(a.seo_description?.trim());
      const hasSummary = Boolean(a.summary?.trim());
      const seoScore =
        (hasTitle ? 0.35 : 0) +
        (hasDesc ? 0.35 : 0) +
        (hasSummary ? 0.2 : 0) +
        (p && p.views > 10 ? 0.1 : 0);

      const organicViews = p?.views ?? 0;
      const ctr = p?.ctr ?? 0;
      const sc = searchClicks.get(a.slug) ?? 0;

      return {
        slug: a.slug,
        headline: a.headline,
        seoScore: Math.min(1, seoScore),
        organicViews,
        ctr,
        searchClicks: sc,
        positionEstimate: Math.max(1, Math.round(20 - seoScore * 15 - ctr * 50)),
      };
    })
    .sort((a, b) => b.seoScore - a.seoScore || b.organicViews - a.organicViews)
    .slice(0, 15);
}

function buildCtrAnalytics(
  events: Array<{
    event_type: string;
    surface: string | null;
    article_slug: string | null;
  }>,
  perf: EnterpriseAnalyticsReport["topArticles"]
): CtrAnalytics {
  const bySurface = new Map<
    string,
    { views: number; clicks: number }
  >();

  for (const e of events) {
    const surface = e.surface ?? "unknown";
    const s = bySurface.get(surface) ?? { views: 0, clicks: 0 };
    if (e.event_type === "article_view") s.views += 1;
    if (e.event_type === "article_click") s.clicks += 1;
    bySurface.set(surface, s);
  }

  const totalViews = [...bySurface.values()].reduce((s, v) => s + v.views, 0);
  const totalClicks = [...bySurface.values()].reduce((s, v) => s + v.clicks, 0);

  return {
    overall: totalViews ? totalClicks / totalViews : 0,
    bySurface: [...bySurface.entries()]
      .map(([surface, v]) => ({
        surface,
        views: v.views,
        clicks: v.clicks,
        ctr: v.views ? v.clicks / v.views : 0,
      }))
      .sort((a, b) => b.views - a.views),
    topClickDrivers: [...perf]
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, 8)
      .map((a) => ({
        slug: a.slug,
        headline: a.headline,
        ctr: a.ctr,
        clicks: a.clicks,
      })),
  };
}

function buildAudienceRetention(
  events: Array<{ session_hash: string | null; created_at: string }>,
  windowHours: number
): AudienceRetentionPoint[] {
  const sessionFirst = new Map<string, number>();
  const sessionCounts = new Map<string, number>();

  for (const e of events) {
    if (!e.session_hash) continue;
    const t = new Date(e.created_at).getTime();
    const prev = sessionFirst.get(e.session_hash);
    if (prev == null || t < prev) sessionFirst.set(e.session_hash, t);
    sessionCounts.set(
      e.session_hash,
      (sessionCounts.get(e.session_hash) ?? 0) + 1
    );
  }

  const buckets =
    windowHours <= 48 ? 6 : windowHours <= 168 ? 7 : 10;
  const bucketMs = (windowHours * 3600_000) / buckets;
  const now = Date.now();
  const points: AudienceRetentionPoint[] = [];

  for (let i = buckets - 1; i >= 0; i--) {
    const start = now - (i + 1) * bucketMs;
    const end = now - i * bucketMs;
    const label =
      windowHours <= 48
        ? new Date(end).toLocaleTimeString(undefined, { hour: "numeric" })
        : new Date(end).toLocaleDateString(undefined, { weekday: "short" });

    let returning = 0;
    let newSessions = 0;

    for (const [hash, first] of sessionFirst) {
      if (first < start || first >= end) continue;
      const count = sessionCounts.get(hash) ?? 1;
      if (count > 1) returning += 1;
      else newSessions += 1;
    }

    const total = returning + newSessions;
    points.push({
      label,
      returningSessions: returning,
      newSessions,
      retentionRate: total ? returning / total : 0,
    });
  }

  return points;
}

function buildScrollDepthBuckets(
  events: Array<{ event_type: string; value_num: number | null }>
): ScrollDepthBucket[] {
  const buckets = [
    { bucket: "0–25%", min: 0, max: 25, count: 0 },
    { bucket: "25–50%", min: 25, max: 50, count: 0 },
    { bucket: "50–75%", min: 50, max: 75, count: 0 },
    { bucket: "75–100%", min: 75, max: 101, count: 0 },
  ];

  const scrollEvents = events.filter((e) => e.event_type === "scroll_depth");
  for (const e of scrollEvents) {
    const v = Number(e.value_num ?? 0);
    const b = buckets.find((x) => v >= x.min && v < x.max);
    if (b) b.count += 1;
  }

  const total = scrollEvents.length || 1;
  return buckets.map((b) => ({
    bucket: b.bucket,
    count: b.count,
    pct: Math.round((b.count / total) * 100),
  }));
}

function buildSourcePerformance(
  articles: Array<{
    slug: string;
    editorial_metadata: Record<string, unknown> | null;
  }>,
  perf: EnterpriseAnalyticsReport["topArticles"]
): SourcePerformanceRow[] {
  const map = new Map<string, SourcePerformanceRow>();

  for (const a of articles) {
    const meta = (a.editorial_metadata ?? {}) as {
      source_attribution?: Array<{
        source: string | null;
        provider: string;
        confidence?: number;
      }>;
    };
    const p = perf.find((x) => x.slug === a.slug);

    for (const s of meta.source_attribution ?? [{ source: "desk", provider: "internal" }]) {
      const key = `${s.provider}|${s.source ?? "unknown"}`;
      const prev = map.get(key) ?? {
        sourceKey: key,
        sourceName: s.source ?? s.provider,
        provider: s.provider,
        articles: 0,
        views: 0,
        avgTrust: 0,
        avgEngagement: 0,
      };
      prev.articles += 1;
      prev.views += p?.views ?? 0;
      prev.avgTrust += s.confidence ?? 0.5;
      prev.avgEngagement += p?.engagementScore ?? 0;
      map.set(key, prev);
    }
  }

  return [...map.values()]
    .map((s) => ({
      ...s,
      avgTrust: s.articles ? s.avgTrust / s.articles : 0,
      avgEngagement: s.articles
        ? Math.round(s.avgEngagement / s.articles)
        : 0,
    }))
    .sort((a, b) => b.views - a.views)
    .slice(0, 12);
}

function buildProductivity(
  articles: Array<{
    published_at: string | null;
    created_at: string;
    editorial_status: string | null;
  }>,
  workflowEvents: Array<{ event_type: string }>
): NewsroomProductivity {
  const published = articles.filter((a) => a.published_at);
  const draft = articles.filter(
    (a) => !a.published_at || a.editorial_status === "draft"
  );

  const publishDeltas: number[] = [];
  for (const a of published) {
    if (!a.published_at) continue;
    const hrs =
      (new Date(a.published_at).getTime() - new Date(a.created_at).getTime()) /
      3600_000;
    if (hrs >= 0 && hrs < 720) publishDeltas.push(hrs);
  }

  const deskActions24h = workflowEvents.filter((e) =>
    ["transition", "comment", "assign"].some((t) =>
      String(e.event_type).includes(t)
    )
  ).length;

  return {
    articlesPublished: published.length,
    articlesDraft: draft.length,
    workflowTransitions: workflowEvents.length,
    avgTimeToPublishHours: publishDeltas.length
      ? Math.round(
          (publishDeltas.reduce((s, h) => s + h, 0) / publishDeltas.length) * 10
        ) / 10
      : null,
    deskActions24h,
  };
}

function buildPublishingVelocity(
  articles: Array<{
    published_at: string | null;
    created_at: string;
    editorial_status: string | null;
  }>,
  windowHours: number
): PublishingVelocityPoint[] {
  const buckets = windowHours <= 48 ? 12 : 7;
  const bucketMs = (windowHours * 3600_000) / buckets;
  const now = Date.now();
  const points: PublishingVelocityPoint[] = [];

  for (let i = buckets - 1; i >= 0; i--) {
    const start = now - (i + 1) * bucketMs;
    const end = now - i * bucketMs;
    const label =
      windowHours <= 48
        ? new Date(end).toLocaleTimeString(undefined, { hour: "numeric" })
        : new Date(end).toLocaleDateString(undefined, { weekday: "short" });

    let published = 0;
    let drafted = 0;

    for (const a of articles) {
      const created = new Date(a.created_at).getTime();
      if (created < start || created >= end) continue;
      if (a.published_at) published += 1;
      else drafted += 1;
    }

    points.push({ label, published, drafted });
  }

  return points;
}

function buildAiConfidenceTrend(
  articles: Array<{
    created_at: string;
    editorial_metadata: Record<string, unknown> | null;
  }>,
  windowHours: number
): AiConfidenceTrendPoint[] {
  const buckets = windowHours <= 48 ? 8 : 7;
  const bucketMs = (windowHours * 3600_000) / buckets;
  const now = Date.now();
  const points: AiConfidenceTrendPoint[] = [];

  for (let i = buckets - 1; i >= 0; i--) {
    const start = now - (i + 1) * bucketMs;
    const end = now - i * bucketMs;
    const label = new Date(end).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });

    const inBucket = articles.filter((a) => {
      const t = new Date(a.created_at).getTime();
      return t >= start && t < end;
    });

    let sum = 0;
    let n = 0;
    for (const a of inBucket) {
      const conf = (a.editorial_metadata as { ai_confidence?: number })
        ?.ai_confidence;
      if (conf != null) {
        sum += conf;
        n += 1;
      }
    }

    points.push({
      label,
      avgConfidence: n ? Math.round((sum / n) * 1000) / 1000 : 0,
      articleCount: inBucket.length,
    });
  }

  return points;
}

function extendEmpty(
  base: Awaited<ReturnType<typeof buildNewsroomAnalyticsReport>>
): EnterpriseAnalyticsReport {
  return {
    ...base,
    liveReaders: {
      activeReaders: 0,
      activeSessions5m: 0,
      peakReaders24h: 0,
      viewsPerMinute: 0,
    },
    rankedArticles: [],
    districtEngagement: [],
    seoRankings: [],
    ctrAnalytics: { overall: 0, bySurface: [], topClickDrivers: [] },
    audienceRetention: [],
    scrollDepth: [],
    sourcePerformance: [],
    productivity: {
      articlesPublished: 0,
      articlesDraft: 0,
      workflowTransitions: 0,
      avgTimeToPublishHours: null,
      deskActions24h: 0,
    },
    publishingVelocity: [],
    aiConfidenceTrend: [],
    geographicAnalytics: [],
    adminInsights: [],
    scheduledReports: [],
  };
}
