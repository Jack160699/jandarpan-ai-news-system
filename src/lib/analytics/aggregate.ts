/**
 * Aggregate reader events + AI articles into newsroom intelligence report
 */

import { createAdminServerClient, isSupabaseConfigured } from "@/lib/supabase";
import type {
  ArticlePerformanceRow,
  BreakingVelocityRow,
  CategoryIntelligenceRow,
  NewsroomAnalyticsReport,
  RegionalTrendRow,
  TopicHeatCell,
  TrendPoint,
} from "@/lib/analytics/types";

const DEFAULT_WINDOW_HOURS = 168;

export async function buildNewsroomAnalyticsReport(
  tenantId: string,
  windowHours = DEFAULT_WINDOW_HOURS
): Promise<NewsroomAnalyticsReport> {
  const empty = emptyReport(windowHours);
  if (!isSupabaseConfigured()) return empty;

  const since = new Date(Date.now() - windowHours * 3600_000).toISOString();
  const supabase = createAdminServerClient();

  const [eventsRes, articlesRes, rollupsRes] = await Promise.all([
    supabase
      .from("reader_analytics_events")
      .select(
        "event_type, article_slug, category, region, surface, value_num, created_at"
      )
      .eq("tenant_id", tenantId)
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(8000),
    supabase
      .from("generated_articles")
      .select(
        "slug, headline, tags, published_at, editorial_metadata, geo_metadata, editorial_status"
      )
      .eq("tenant_id", tenantId)
      .order("published_at", { ascending: false })
      .limit(120),
    supabase
      .from("article_metrics_daily")
      .select("*")
      .eq("tenant_id", tenantId)
      .gte(
        "bucket_date",
        new Date(Date.now() - windowHours * 3600_000).toISOString().slice(0, 10)
      ),
  ]);

  const events = eventsRes.data ?? [];
  const articles = articlesRes.data ?? [];
  const rollups = rollupsRes.data ?? [];

  const articleMap = new Map(
    articles.map((a) => {
      const meta = (a.editorial_metadata ?? {}) as Record<string, unknown>;
      return [
        a.slug,
        {
          headline: a.headline,
          category: (a.tags?.[0] as string) ?? null,
          region:
            (a.geo_metadata as { primary_district?: string })?.primary_district ??
            null,
          aiConfidence: (meta.ai_confidence as number) ?? null,
          isBreaking: Boolean(meta.is_breaking),
          publishedAt: a.published_at,
        },
      ];
    })
  );

  const slugStats = new Map<
    string,
    {
      views: number;
      clicks: number;
      dwellMs: number;
      dwellN: number;
      scrollSum: number;
      scrollN: number;
      category: string | null;
      region: string | null;
    }
  >();

  for (const ev of events) {
    const slug = ev.article_slug;
    if (!slug) continue;
    const s =
      slugStats.get(slug) ??
      {
        views: 0,
        clicks: 0,
        dwellMs: 0,
        dwellN: 0,
        scrollSum: 0,
        scrollN: 0,
        category: ev.category,
        region: ev.region,
      };

    if (ev.event_type === "article_view") s.views += 1;
    if (ev.event_type === "article_click") s.clicks += 1;
    if (ev.event_type === "dwell" && ev.value_num) {
      s.dwellMs += Number(ev.value_num);
      s.dwellN += 1;
    }
    if (ev.event_type === "scroll_depth" && ev.value_num != null) {
      s.scrollSum += Number(ev.value_num);
      s.scrollN += 1;
    }

    slugStats.set(slug, s);
  }

  for (const r of rollups) {
    const s = slugStats.get(r.article_slug) ?? {
      views: 0,
      clicks: 0,
      dwellMs: 0,
      dwellN: 0,
      scrollSum: 0,
      scrollN: 0,
      category: null,
      region: null,
    };
    s.views += r.views ?? 0;
    s.clicks += r.clicks ?? 0;
    s.dwellMs += Number(r.total_dwell_ms ?? 0);
    s.scrollN += r.scroll_samples ?? 0;
    s.scrollSum += Number(r.scroll_depth_sum ?? 0);
    slugStats.set(r.article_slug, s);
  }

  const topArticles: ArticlePerformanceRow[] = [...slugStats.entries()]
    .map(([slug, s]) => {
      const art = articleMap.get(slug);
      const ctr = s.views ? s.clicks / s.views : 0;
      const avgDwell = s.dwellN ? s.dwellMs / s.dwellN / 1000 : 0;
      const avgScroll = s.scrollN ? s.scrollSum / s.scrollN : 0;
      const engagementScore = scoreEngagement({
        ctr,
        avgDwell,
        avgScroll,
        views: s.views,
      });
      return {
        slug,
        headline: art?.headline ?? slug,
        category: s.category ?? art?.category ?? null,
        region: s.region ?? art?.region ?? null,
        views: s.views,
        clicks: s.clicks,
        ctr,
        avgDwellSec: Math.round(avgDwell),
        avgScrollDepth: Math.round(avgScroll),
        engagementScore,
        aiConfidence: art?.aiConfidence ?? null,
        isBreaking: art?.isBreaking ?? false,
        publishedAt: art?.publishedAt ?? null,
      };
    })
    .sort((a, b) => b.engagementScore - a.engagementScore);

  const aiLeaders = [...topArticles]
    .filter((a) => a.aiConfidence != null)
    .sort((a, b) => (b.aiConfidence ?? 0) - (a.aiConfidence ?? 0))
    .slice(0, 10);

  const totalViews = topArticles.reduce((s, a) => s + a.views, 0);
  const totalClicks = topArticles.reduce((s, a) => s + a.clicks, 0);

  const regionalHeatmap = buildRegionalHeatmap(topArticles);
  const topicHeatmap = buildTopicHeatmap(topArticles, articles);
  const categoryIntelligence = buildCategoryIntel(topArticles, totalViews);
  const trendSeries = buildTrendSeries(events, windowHours);
  const breakingVelocity = buildBreakingVelocity(events, articleMap, topArticles);

  const dwellEvents = events.filter((e) => e.event_type === "dwell");
  const scrollEvents = events.filter((e) => e.event_type === "scroll_depth");
  const avgRead =
    dwellEvents.length > 0
      ? dwellEvents.reduce((s, e) => s + Number(e.value_num ?? 0), 0) /
        dwellEvents.length /
        1000
      : 0;
  const avgScroll =
    scrollEvents.length > 0
      ? scrollEvents.reduce((s, e) => s + Number(e.value_num ?? 0), 0) /
        scrollEvents.length
      : 0;

  const engagedSessions = new Set(
    events
      .filter(
        (e) =>
          e.event_type === "scroll_depth" && Number(e.value_num ?? 0) >= 50
      )
      .map((e) => e.article_slug)
  ).size;

  return {
    fetchedAt: new Date().toISOString(),
    windowHours,
    privacyNote:
      "Aggregated anonymous metrics only. No personal data stored.",
    summary: {
      totalViews,
      totalClicks,
      overallCtr: totalViews ? totalClicks / totalViews : 0,
      avgReadTimeSec: Math.round(avgRead),
      avgScrollDepth: Math.round(avgScroll),
      engagedSessions,
      breakingVelocityPeak: breakingVelocity[0]?.velocityScore ?? 0,
    },
    trendSeries,
    topArticles: topArticles.slice(0, 15),
    aiLeaders,
    regionalHeatmap,
    topicHeatmap,
    breakingVelocity,
    categoryIntelligence,
  };
}

function scoreEngagement(input: {
  ctr: number;
  avgDwell: number;
  avgScroll: number;
  views: number;
}): number {
  const ctrScore = Math.min(input.ctr * 100, 40);
  const dwellScore = Math.min(input.avgDwell / 3, 30);
  const scrollScore = Math.min(input.avgScroll / 3.33, 20);
  const reachScore = Math.min(Math.log10(input.views + 1) * 10, 10);
  return Math.round(ctrScore + dwellScore + scrollScore + reachScore);
}

function buildRegionalHeatmap(
  articles: ArticlePerformanceRow[]
): RegionalTrendRow[] {
  const map = new Map<string, RegionalTrendRow>();

  for (const a of articles) {
    const region = a.region ?? "national";
    const prev = map.get(region) ?? {
      region,
      views: 0,
      clicks: 0,
      articles: 0,
      heat: 0,
    };
    prev.views += a.views;
    prev.clicks += a.clicks;
    prev.articles += 1;
    map.set(region, prev);
  }

  const maxViews = Math.max(...[...map.values()].map((r) => r.views), 1);

  return [...map.values()]
    .map((r) => ({
      ...r,
      heat: Math.round((r.views / maxViews) * 100),
    }))
    .sort((a, b) => b.heat - a.heat)
    .slice(0, 12);
}

function buildTopicHeatmap(
  perf: ArticlePerformanceRow[],
  articles: Array<{ slug: string; tags: string[] | null }>
): TopicHeatCell[] {
  const map = new Map<string, TopicHeatCell>();

  for (const a of perf) {
    const row = articles.find((x) => x.slug === a.slug);
    const topics = row?.tags?.length ? row.tags : [a.category ?? "general"];
    for (const topic of topics.slice(0, 3)) {
      const key = topic.toLowerCase();
      const prev = map.get(key) ?? {
        topic: key,
        category: a.category ?? "general",
        count: 0,
        avgEngagement: 0,
        intensity: 0,
      };
      prev.count += a.views;
      prev.avgEngagement += a.engagementScore;
      map.set(key, prev);
    }
  }

  const max = Math.max(...[...map.values()].map((t) => t.count), 1);

  return [...map.values()]
    .map((t) => ({
      ...t,
      avgEngagement: t.count ? Math.round(t.avgEngagement / t.count) : 0,
      intensity: Math.round((t.count / max) * 100),
    }))
    .sort((a, b) => b.intensity - a.intensity)
    .slice(0, 20);
}

function buildCategoryIntel(
  articles: ArticlePerformanceRow[],
  totalViews: number
): CategoryIntelligenceRow[] {
  const map = new Map<string, CategoryIntelligenceRow>();

  for (const a of articles) {
    const cat = a.category ?? "general";
    const prev = map.get(cat) ?? {
      category: cat,
      articles: 0,
      views: 0,
      clicks: 0,
      ctr: 0,
      avgScroll: 0,
      shareOfTraffic: 0,
    };
    prev.articles += 1;
    prev.views += a.views;
    prev.clicks += a.clicks;
    prev.avgScroll += a.avgScrollDepth;
    map.set(cat, prev);
  }

  return [...map.values()]
    .map((c) => ({
      ...c,
      ctr: c.views ? c.clicks / c.views : 0,
      avgScroll: c.articles ? Math.round(c.avgScroll / c.articles) : 0,
      shareOfTraffic: totalViews
        ? Math.round((c.views / totalViews) * 1000) / 10
        : 0,
    }))
    .sort((a, b) => b.views - a.views);
}

function buildTrendSeries(
  events: Array<{ event_type: string; created_at: string }>,
  windowHours: number
): TrendPoint[] {
  const buckets =
    windowHours <= 48 ? 12 : windowHours <= 168 ? 7 : 14;
  const bucketMs = (windowHours * 3600_000) / buckets;
  const now = Date.now();
  const points: TrendPoint[] = [];

  for (let i = buckets - 1; i >= 0; i--) {
    const start = now - (i + 1) * bucketMs;
    const end = now - i * bucketMs;
    const label =
      windowHours <= 48
        ? new Date(end).toLocaleTimeString(undefined, {
            hour: "numeric",
          })
        : new Date(end).toLocaleDateString(undefined, {
            weekday: "short",
          });

    const inBucket = events.filter((e) => {
      const t = new Date(e.created_at).getTime();
      return t >= start && t < end;
    });

    points.push({
      label,
      views: inBucket.filter((e) => e.event_type === "article_view").length,
      clicks: inBucket.filter((e) => e.event_type === "article_click").length,
      engagements: inBucket.filter(
        (e) =>
          e.event_type === "scroll_depth" || e.event_type === "article_click"
      ).length,
    });
  }

  return points;
}

function buildBreakingVelocity(
  events: Array<{
    event_type: string;
    article_slug: string | null;
    created_at: string;
  }>,
  articleMap: Map<
    string,
    { headline: string; isBreaking: boolean }
  >,
  perf: ArticlePerformanceRow[]
): BreakingVelocityRow[] {
  const oneHourAgo = Date.now() - 3600_000;
  const bySlug = new Map<string, { v1h: number; v24h: number }>();

  for (const e of events) {
    if (e.event_type !== "article_view" || !e.article_slug) continue;
    const t = new Date(e.created_at).getTime();
    const s = bySlug.get(e.article_slug) ?? { v1h: 0, v24h: 0 };
    s.v24h += 1;
    if (t >= oneHourAgo) s.v1h += 1;
    bySlug.set(e.article_slug, s);
  }

  return [...bySlug.entries()]
    .map(([slug, v]) => {
      const art = articleMap.get(slug);
      const p = perf.find((x) => x.slug === slug);
      const velocity = v.v1h * 3 + v.v24h;
      return {
        slug,
        headline: art?.headline ?? p?.headline ?? slug,
        views1h: v.v1h,
        views24h: v.v24h,
        velocityScore: velocity,
        isBreaking: art?.isBreaking ?? p?.isBreaking ?? false,
      };
    })
    .sort((a, b) => b.velocityScore - a.velocityScore)
    .slice(0, 12);
}

function emptyReport(windowHours: number): NewsroomAnalyticsReport {
  return {
    fetchedAt: new Date().toISOString(),
    windowHours,
    privacyNote: "Aggregated anonymous metrics only.",
    summary: {
      totalViews: 0,
      totalClicks: 0,
      overallCtr: 0,
      avgReadTimeSec: 0,
      avgScrollDepth: 0,
      engagedSessions: 0,
      breakingVelocityPeak: 0,
    },
    trendSeries: [],
    topArticles: [],
    aiLeaders: [],
    regionalHeatmap: [],
    topicHeatmap: [],
    breakingVelocity: [],
    categoryIntelligence: [],
  };
}
