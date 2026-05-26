import type { ArticlePerformanceRow, RankedArticle } from "@/lib/analytics/types";

/**
 * Composite article ranking — engagement, reach, velocity, AI quality
 */
export function rankArticles(
  articles: ArticlePerformanceRow[],
  breakingVelocity: Map<string, number>
): RankedArticle[] {
  const maxViews = Math.max(...articles.map((a) => a.views), 1);
  const maxEng = Math.max(...articles.map((a) => a.engagementScore), 1);

  const scored = articles.map((a) => {
    const factors: string[] = [];
    const normViews = a.views / maxViews;
    const normEng = a.engagementScore / maxEng;
    const velocity = (breakingVelocity.get(a.slug) ?? 0) / 50;
    const aiBoost = a.aiConfidence != null ? a.aiConfidence * 0.15 : 0;
    const breakingBoost = a.isBreaking ? 0.08 : 0;
    const ctrBoost = Math.min(a.ctr * 2, 0.12);

    if (normEng > 0.7) factors.push("high_engagement");
    if (normViews > 0.6) factors.push("reach");
    if (velocity > 0.3) factors.push("velocity");
    if (a.aiConfidence != null && a.aiConfidence >= 0.75) factors.push("ai_quality");
    if (a.ctr >= 0.08) factors.push("ctr");

    const rankScore =
      normEng * 0.35 +
      normViews * 0.25 +
      Math.min(velocity, 1) * 0.15 +
      aiBoost +
      breakingBoost +
      ctrBoost;

    return { ...a, rankScore, rankFactors: factors };
  });

  return scored
    .sort((a, b) => b.rankScore - a.rankScore)
    .map((a, i) => ({
      ...a,
      rank: i + 1,
      rankScore: Math.round(a.rankScore * 1000) / 1000,
    }));
}
