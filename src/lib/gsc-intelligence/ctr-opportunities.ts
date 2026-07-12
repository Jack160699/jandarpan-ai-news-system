/**
 * Module 5 — CTR Opportunities
 */

import type {
  GscPageRecord,
  GscPriority,
  GscQueryRecord,
  GscRecommendationRecord,
} from "@/lib/gsc-intelligence/types";

function ctrPriority(impressions: number, ctr: number, position: number): GscPriority {
  if (impressions >= 500 && ctr < 2 && position <= 10) return "high";
  if (impressions >= 200 && ctr < 3) return "medium";
  return "low";
}

export function detectCtrOpportunities(
  queries: GscQueryRecord[],
  pages: GscPageRecord[]
): GscRecommendationRecord[] {
  const recommendations: GscRecommendationRecord[] = [];

  for (const q of queries) {
    if (q.impressions < 100) continue;
    if (q.position > 15) continue;

    if (q.ctr < 2 && q.impressions >= 200) {
      recommendations.push({
        recommendation_type: "ctr_opportunity",
        priority: ctrPriority(q.impressions, q.ctr, q.position),
        title: `Low CTR for "${q.query}"`,
        reason: `${q.impressions} impressions at position ${q.position} but only ${q.ctr}% CTR.`,
        query: q.query,
        scores: {
          impression_score: q.impressions,
          ctr_gap: Math.round((5 - q.ctr) * 10),
        },
        metadata: {
          suggested_actions: ["improve_title", "improve_meta"],
        },
      });
    }

    if (q.position <= 8 && q.ctr < 3 && q.impressions >= 150) {
      recommendations.push({
        recommendation_type: "title_improvement",
        priority: "medium",
        title: `Title optimization for "${q.query}"`,
        reason: `Good position (${q.position}) but CTR below benchmark for news queries.`,
        query: q.query,
        scores: { position_score: 100 - q.position * 5 },
      });
    }

    if (q.position <= 10 && q.ctr < 2.5) {
      recommendations.push({
        recommendation_type: "meta_improvement",
        priority: "medium",
        title: `Meta description gap for "${q.query}"`,
        reason: "Poor snippet CTR — review meta description and structured data.",
        query: q.query,
        page_url: q.generated_article_slug
          ? `/news/${q.generated_article_slug}`
          : undefined,
      });
    }
  }

  for (const p of pages) {
    if (p.impressions < 200 || p.ctr >= 3) continue;
    recommendations.push({
      recommendation_type: "ctr_opportunity",
      priority: ctrPriority(p.impressions, p.ctr, p.position),
      title: "Page CTR below benchmark",
      reason: `${p.page_url} has ${p.impressions} impressions at ${p.ctr}% CTR.`,
      page_url: p.page_url,
      scores: { impressions: p.impressions },
    });
  }

  return recommendations.slice(0, 100);
}
