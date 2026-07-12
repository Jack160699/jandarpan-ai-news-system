/**
 * SEO Intelligence — Supabase persistence
 */

import { createAdminServerClient, isSupabaseConfigured } from "@/lib/supabase";
import type {
  GapReportRecord,
  KeywordIntelligenceRecord,
  RecommendationRecord,
  SeoIntelligenceDashboard,
  TrendingTopicRecord,
} from "@/lib/seo-intelligence/types";

type SeoTable =
  | "seo_keyword_intelligence"
  | "seo_gap_reports"
  | "seo_trending_topics"
  | "seo_recommendations";

function fromSeo(table: SeoTable) {
  return createAdminServerClient().from(table as never);
}

export async function clearAnalysisOutputs(): Promise<void> {
  await Promise.all([
    fromSeo("seo_gap_reports").delete().neq("id", "00000000-0000-0000-0000-000000000000"),
    fromSeo("seo_trending_topics").delete().neq("id", "00000000-0000-0000-0000-000000000000"),
    fromSeo("seo_recommendations").delete().eq("status", "open"),
  ]);
}

export async function upsertKeywordIntelligence(
  records: KeywordIntelligenceRecord[]
): Promise<number> {
  if (records.length === 0) return 0;
  let saved = 0;

  for (const record of records.slice(0, 200)) {
    const { error } = await fromSeo("seo_keyword_intelligence").upsert(
      {
        keyword: record.keyword,
        frequency: record.frequency,
        trend: record.trend,
        competitors_using: record.competitors_using,
        district: record.district,
        entity_type: record.entity_type,
        last_seen: record.last_seen,
        metadata: record.metadata ?? {},
        updated_at: new Date().toISOString(),
      } as never,
      { onConflict: "keyword" }
    );
    if (!error) saved += 1;
  }

  return saved;
}

export async function insertGapReports(records: GapReportRecord[]): Promise<number> {
  if (records.length === 0) return 0;
  const batch = records.slice(0, 300).map((r) => ({
    competitor_article_id: r.competitor_article_id,
    generated_article_id: r.generated_article_id,
    generated_article_slug: r.generated_article_slug,
    gap_type: r.gap_type,
    gap_score: r.gap_score,
    priority: r.priority,
    reason: r.reason,
    district: r.district,
    category: r.category,
    keyword: r.keyword,
    metadata: r.metadata ?? {},
  }));

  const { error } = await fromSeo("seo_gap_reports").insert(batch as never);
  if (error) throw new Error(error.message);
  return batch.length;
}

export async function upsertTrendingTopics(
  records: TrendingTopicRecord[]
): Promise<number> {
  if (records.length === 0) return 0;
  let saved = 0;

  for (const record of records.slice(0, 100)) {
    const { error } = await fromSeo("seo_trending_topics").upsert(
      {
        topic: record.topic,
        cluster_key: record.cluster_key,
        trend: record.trend,
        article_count: record.article_count,
        competitor_count: record.competitor_count,
        district: record.district,
        keywords: record.keywords,
        score: record.score,
        last_seen: record.last_seen,
        metadata: record.metadata ?? {},
        updated_at: new Date().toISOString(),
      } as never,
      { onConflict: "cluster_key" }
    );
    if (!error) saved += 1;
  }

  return saved;
}

export async function insertRecommendations(
  records: RecommendationRecord[]
): Promise<number> {
  if (records.length === 0) return 0;
  const batch = records.slice(0, 150).map((r) => ({
    type: r.type,
    priority: r.priority,
    title: r.title,
    reason: r.reason,
    district: r.district,
    keyword: r.keyword,
    article_slug: r.article_slug,
    competitor_article_id: r.competitor_article_id,
    scores: r.scores,
    status: "open",
    metadata: r.metadata ?? {},
    updated_at: new Date().toISOString(),
  }));

  const { error } = await fromSeo("seo_recommendations").insert(batch as never);
  if (error) throw new Error(error.message);
  return batch.length;
}

export async function getSeoIntelligenceDashboard(): Promise<SeoIntelligenceDashboard> {
  if (!isSupabaseConfigured()) {
    return emptyDashboard();
  }

  const [
    keywordsRes,
    gapsRes,
    trendingRes,
    recommendationsRes,
  ] = await Promise.all([
    fromSeo("seo_keyword_intelligence")
      .select("*")
      .order("frequency", { ascending: false })
      .limit(12),
    fromSeo("seo_gap_reports")
      .select("*")
      .eq("gap_type", "missing_story")
      .order("gap_score", { ascending: false })
      .limit(12),
    fromSeo("seo_trending_topics")
      .select("*")
      .order("score", { ascending: false })
      .limit(10),
    fromSeo("seo_recommendations")
      .select("*")
      .eq("status", "open")
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  const keywords = (keywordsRes.data ?? []) as KeywordIntelligenceRecord[];
  const gaps = (gapsRes.data ?? []) as GapReportRecord[];
  const trending = (trendingRes.data ?? []) as TrendingTopicRecord[];
  const recommendations = (recommendationsRes.data ?? []) as RecommendationRecord[];

  const districtCoverage = recommendations
    .filter((r) => r.type === "high_priority_district")
    .map((r) => ({
      district: r.district ?? "",
      districtName: String(r.metadata?.districtName ?? r.district ?? ""),
      competitorArticlesToday: Number(r.scores.competitor_articles_today ?? 0),
      jandarpanArticlesToday: Number(r.scores.jandarpan_articles_today ?? 0),
      coveragePercent: Number(r.scores.coverage_percent ?? 0),
      missingStories: Number(r.scores.missing_stories ?? 0),
      trendScore: Number(r.scores.trend_score ?? 0),
      recommendation: r.reason,
    }));

  const headlineScores = recommendations
    .filter((r) => r.type === "improve_title")
    .map((r) => ({
      headline: String(r.metadata?.headline ?? r.title),
      length: 0,
      keywordPosition: null,
      districtPosition: null,
      hasNumber: false,
      powerWordCount: 0,
      isQuestion: false,
      hasBreakingPrefix: false,
      headlineScore: Number(r.scores.headline_score ?? 0),
      ctrPrediction: Number(r.scores.ctr_prediction ?? 0),
      seoScore: Number(r.scores.seo_score ?? 0),
    }));

  const seoHealth = Math.round(
    recommendations.reduce((sum, r) => sum + Number(r.scores.seo_score ?? 70), 0) /
      Math.max(recommendations.length, 1)
  );

  const coveragePercent = Math.round(
    districtCoverage.reduce((sum, d) => sum + d.coveragePercent, 0) /
      Math.max(districtCoverage.length, 1)
  );

  const competitorAdvantage = gaps.length;

  const lastAnalysisAt =
    recommendations[0]?.metadata?.analysisAt != null
      ? String(recommendations[0].metadata.analysisAt)
      : recommendations[0]
        ? new Date().toISOString()
        : null;

  return {
    seoHealth: Number.isFinite(seoHealth) ? seoHealth : 0,
    coveragePercent: Number.isFinite(coveragePercent) ? coveragePercent : 0,
    districtCoverage,
    trendingKeywords: keywords,
    missingStories: gaps,
    competitorAdvantage,
    headlineScores,
    recommendations,
    trendingTopics: trending,
    lastAnalysisAt,
  };
}

export async function listOpenRecommendations(
  limit = 50
): Promise<RecommendationRecord[]> {
  if (!isSupabaseConfigured()) return [];

  const { data, error } = await fromSeo("seo_recommendations")
    .select("*")
    .eq("status", "open")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return (data ?? []) as RecommendationRecord[];
}

function emptyDashboard(): SeoIntelligenceDashboard {
  return {
    seoHealth: 0,
    coveragePercent: 0,
    districtCoverage: [],
    trendingKeywords: [],
    missingStories: [],
    competitorAdvantage: 0,
    headlineScores: [],
    recommendations: [],
    trendingTopics: [],
    lastAnalysisAt: null,
  };
}
