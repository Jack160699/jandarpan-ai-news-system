/**
 * Module 7 — Editor Recommendations
 */

import type { DistrictCoverageRecord } from "@/lib/seo-intelligence/types";
import type { HeadlineAnalysis } from "@/lib/seo-intelligence/types";
import type { GapReportRecord } from "@/lib/seo-intelligence/types";
import type { KeywordIntelligenceRecord } from "@/lib/seo-intelligence/types";
import type { SeoScorecard } from "@/lib/seo-intelligence/types";
import type { TrendingTopicRecord } from "@/lib/seo-intelligence/types";
import type {
  RecommendationRecord,
  SeoPriority,
} from "@/lib/seo-intelligence/types";

export type RecommendationInput = {
  gaps: GapReportRecord[];
  keywords: KeywordIntelligenceRecord[];
  districtCoverage: DistrictCoverageRecord[];
  jandarpanHeadlines: HeadlineAnalysis[];
  scorecards: SeoScorecard[];
  trendingTopics: TrendingTopicRecord[];
};

export function generateRecommendations(
  input: RecommendationInput
): RecommendationRecord[] {
  const recs: RecommendationRecord[] = [];

  for (const gap of input.gaps.filter((g) => g.gap_type === "missing_story").slice(0, 15)) {
    recs.push({
      type: "publish_story",
      priority: gap.priority,
      title: `Publish missing story: ${gap.keyword ?? "competitor topic"}`,
      reason: gap.reason,
      district: gap.district,
      keyword: gap.keyword,
      article_slug: null,
      competitor_article_id: gap.competitor_article_id,
      scores: { gap_score: gap.gap_score },
      metadata: gap.metadata,
    });
  }

  for (const gap of input.gaps.filter((g) => g.gap_type === "similar_story").slice(0, 8)) {
    if (!gap.generated_article_slug) continue;
    recs.push({
      type: "update_article",
      priority: gap.priority,
      title: `Update existing story angle`,
      reason: gap.reason,
      district: gap.district,
      keyword: gap.keyword,
      article_slug: gap.generated_article_slug,
      competitor_article_id: gap.competitor_article_id,
      scores: { gap_score: gap.gap_score },
    });
  }

  for (const gap of input.gaps.filter((g) => g.gap_type === "missing_faq").slice(0, 6)) {
    recs.push({
      type: "add_faq",
      priority: gap.priority,
      title: "Add FAQ / structured answers",
      reason: gap.reason,
      district: gap.district,
      keyword: gap.keyword,
      article_slug: gap.generated_article_slug,
      competitor_article_id: gap.competitor_article_id,
      scores: { gap_score: gap.gap_score },
    });
  }

  for (const score of input.scorecards.filter((s) => s.internalLinking < 55).slice(0, 8)) {
    recs.push({
      type: "improve_internal_links",
      priority: "medium",
      title: `Improve internal links: ${score.headline.slice(0, 60)}`,
      reason: "Article has weak internal linking signals for SEO.",
      district: null,
      keyword: null,
      article_slug: score.articleSlug,
      competitor_article_id: null,
      scores: {
        seo_score: score.seoScore,
        internal_linking: score.internalLinking,
      },
    });
  }

  for (const headline of input.jandarpanHeadlines.filter((h) => h.headlineScore < 60).slice(0, 8)) {
    recs.push({
      type: "improve_title",
      priority: priorityFromScore(headline.headlineScore),
      title: `Improve headline: ${headline.headline.slice(0, 70)}`,
      reason: `Headline score ${headline.headlineScore}/100 — optimize length, keyword position, or power words.`,
      district: null,
      keyword: null,
      article_slug: null,
      competitor_article_id: null,
      scores: {
        headline_score: headline.headlineScore,
        ctr_prediction: headline.ctrPrediction,
        seo_score: headline.seoScore,
      },
      metadata: { headline: headline.headline },
    });
  }

  for (const district of input.districtCoverage.filter((d) => d.missingStories >= 2).slice(0, 6)) {
    recs.push({
      type: "high_priority_district",
      priority: "high",
      title: `High priority district: ${district.districtName}`,
      reason: district.recommendation,
      district: district.district,
      keyword: null,
      article_slug: null,
      competitor_article_id: null,
      scores: {
        coverage_percent: district.coveragePercent,
        trend_score: district.trendScore,
        missing_stories: district.missingStories,
        competitor_articles_today: district.competitorArticlesToday,
        jandarpan_articles_today: district.jandarpanArticlesToday,
      },
      metadata: { districtName: district.districtName },
    });
  }

  for (const keyword of input.keywords.filter((k) => k.trend === "rising").slice(0, 10)) {
    recs.push({
      type: "trending_keyword",
      priority: keyword.frequency >= 5 ? "high" : "medium",
      title: `Trending keyword: ${keyword.keyword}`,
      reason: `Used by ${keyword.competitors_using.length} competitors with ${keyword.trend} trend.`,
      district: keyword.district,
      keyword: keyword.keyword,
      article_slug: null,
      competitor_article_id: null,
      scores: { frequency: keyword.frequency },
      metadata: { competitors: keyword.competitors_using },
    });
  }

  for (const topic of input.trendingTopics.filter((t) => t.trend === "breaking").slice(0, 5)) {
    recs.push({
      type: "publish_story",
      priority: "high",
      title: `Breaking cluster: ${topic.topic}`,
      reason: `${topic.competitor_count} competitors covering breaking topic cluster.`,
      district: topic.district,
      keyword: topic.keywords[0] ?? null,
      article_slug: null,
      competitor_article_id: null,
      scores: { topic_score: topic.score },
      metadata: { trend: topic.trend, keywords: topic.keywords },
    });
  }

  return dedupeRecommendations(recs).sort((a, b) => {
    const priorityRank: Record<SeoPriority, number> = {
      high: 3,
      medium: 2,
      low: 1,
    };
    return priorityRank[b.priority] - priorityRank[a.priority];
  });
}

function priorityFromScore(score: number): SeoPriority {
  if (score < 45) return "high";
  if (score < 60) return "medium";
  return "low";
}

function dedupeRecommendations(
  recs: RecommendationRecord[]
): RecommendationRecord[] {
  const seen = new Set<string>();
  const out: RecommendationRecord[] = [];
  for (const rec of recs) {
    const key = `${rec.type}:${rec.title}:${rec.article_slug ?? ""}:${rec.keyword ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(rec);
  }
  return out;
}
