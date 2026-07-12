/**
 * Module 1 — Executive Dashboard aggregator
 */

import { getCompetitorDashboardStats } from "@/lib/competitor-intelligence/repository";
import { getSeoIntelligenceDashboard } from "@/lib/seo-intelligence/repository";
import { getSerpRankingsDashboard } from "@/lib/serp-intelligence/repository";
import { getGscDashboard } from "@/lib/gsc-intelligence/repository";
import { getExecutionDashboard } from "@/lib/seo-execution/repository";
import { createAdminServerClient, isSupabaseConfigured } from "@/lib/supabase";
import type { ExecutiveDashboard } from "@/lib/ai-copilot/types";

export async function buildExecutiveDashboard(): Promise<ExecutiveDashboard> {
  const [seo, serp, gsc, execution, competitor] = await Promise.all([
    getSeoIntelligenceDashboard().catch(() => null),
    getSerpRankingsDashboard().catch(() => null),
    getGscDashboard().catch(() => null),
    getExecutionDashboard().catch(() => null),
    getCompetitorDashboardStats().catch(() => null),
  ]);

  let publishedToday = 0;
  let scheduled = 0;

  if (isSupabaseConfigured()) {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const supabase = createAdminServerClient();
    const [pubRes, schedRes] = await Promise.all([
      supabase
        .from("generated_articles")
        .select("id", { count: "exact", head: true })
        .gte("published_at", today.toISOString()),
      supabase
        .from("generated_articles")
        .select("id", { count: "exact", head: true })
        .eq("workflow_status", "scheduled"),
    ]);
    publishedToday = pubRes.count ?? 0;
    scheduled = schedRes.count ?? 0;
  }

  const topCompetitorSource =
    competitor?.latestCrawl?.articlesSaved != null
      ? `${competitor.latestCrawl.articlesSaved} articles last crawl`
      : null;

  return {
    overallSeoHealth: seo?.seoHealth ?? 0,
    trafficTrend: {
      clicks: gsc?.clicks ?? 0,
      impressions: gsc?.impressions ?? 0,
      clicksDelta: gsc?.trends.days7.clicks_delta ?? 0,
    },
    publishingStatus: {
      publishedToday,
      scheduled,
      pendingReview: execution?.pendingCount ?? 0,
    },
    competitorActivity: {
      articlesLast24h: competitor?.newArticlesToday ?? 0,
      topSource: topCompetitorSource,
    },
    serpVisibility: serp?.visibilityScore ?? 0,
    searchConsoleSummary: {
      clicks: gsc?.clicks ?? 0,
      ctr: gsc?.ctr ?? 0,
      avgPosition: gsc?.averagePosition ?? 0,
    },
    pendingSeoRecommendations:
      (seo?.recommendations?.length ?? 0) +
      (serp?.topOpportunities?.length ?? 0) +
      (gsc?.ctrOpportunities?.length ?? 0),
    pendingEditorialReviews: execution?.pendingCount ?? 0,
    districtCoverage: (seo?.districtCoverage ?? []).slice(0, 8).map((d) => ({
      district: d.districtName || d.district,
      coveragePercent: d.coveragePercent,
      trend: d.trendScore > 0 ? "rising" : "stable",
    })),
    breakingTopics: (seo?.trendingTopics ?? [])
      .filter((t) => t.trend === "breaking" || t.trend === "trending")
      .slice(0, 8)
      .map((t) => ({
        topic: t.topic,
        score: t.score,
        trend: t.trend,
      })),
  };
}
