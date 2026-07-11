/**
 * Module 6 — Position Opportunities
 */

import type {
  GscPriority,
  GscQueryRecord,
  GscRecommendationRecord,
} from "@/lib/gsc-intelligence/types";

function positionPriority(pos: number): GscPriority {
  if (pos >= 4 && pos <= 8) return "high";
  if (pos <= 12) return "medium";
  return "low";
}

export function detectPositionOpportunities(
  queries: GscQueryRecord[]
): GscRecommendationRecord[] {
  const recommendations: GscRecommendationRecord[] = [];

  for (const q of queries) {
    if (q.position < 4 || q.position > 20) continue;
    if (q.impressions < 50) continue;

    recommendations.push({
      recommendation_type: "position_opportunity",
      priority: positionPriority(q.position),
      title: `Striking distance: "${q.query}"`,
      reason: `Ranking at position ${q.position} with ${q.impressions} impressions — optimize to reach top 3.`,
      query: q.query,
      scores: { position_score: 100 - q.position * 4 },
      metadata: {
        current_position: q.position,
        suggested_actions: [
          "expand_article",
          "add_faq",
          "improve_title",
          "improve_schema",
          "improve_internal_links",
        ],
      },
    });

    if (q.position >= 6 && q.position <= 15) {
      recommendations.push({
        recommendation_type: "expand_article",
        priority: positionPriority(q.position),
        title: `Expand coverage for "${q.query}"`,
        reason: "Content depth likely insufficient for page-one top positions.",
        query: q.query,
        page_url: q.generated_article_slug
          ? `/news/${q.generated_article_slug}`
          : undefined,
      });
    }

    if (q.position >= 4 && q.position <= 12 && q.impressions >= 100) {
      recommendations.push({
        recommendation_type: "add_faq",
        priority: "medium",
        title: `Add FAQ for "${q.query}"`,
        reason: "FAQ blocks help win PAA and improve position 4–12 queries.",
        query: q.query,
      });
    }
  }

  return recommendations.slice(0, 80);
}
