/**
 * AI editorial recommendations for newsroom desk
 */

import type {
  BreakingCandidate,
  EditorialRecommendation,
  SeoOpportunity,
} from "@/lib/intelligence/types";

type ArticleRecInput = {
  id: string;
  headline: string;
  editorial_status: string;
  fakeRiskLevel: string;
  viralScore: number;
  seoScore: number;
  breakingScore: number;
  is_breaking: boolean;
  published_at: string | null;
  duplicateClusterId: string | null;
};

export function buildEditorialRecommendations(input: {
  articles: ArticleRecInput[];
  breakingCandidates: BreakingCandidate[];
  seoOpportunities: SeoOpportunity[];
  pendingCount: number;
  highRiskCount: number;
  duplicateCount: number;
}): EditorialRecommendation[] {
  const recs: EditorialRecommendation[] = [];
  let id = 0;
  const nextId = () => `rec-${++id}`;

  if (input.pendingCount > 8) {
    recs.push({
      id: nextId(),
      priority: "high",
      action: "Clear moderation queue",
      reason: `${input.pendingCount} stories awaiting review — assign desk shifts`,
    });
  }

  if (input.highRiskCount > 0) {
    recs.push({
      id: nextId(),
      priority: "high",
      action: "Fact-check high-risk drafts",
      reason: `${input.highRiskCount} articles flagged for misinformation risk`,
    });
  }

  if (input.duplicateCount > 2) {
    recs.push({
      id: nextId(),
      priority: "medium",
      action: "Merge duplicate clusters",
      reason: `${input.duplicateCount} duplicate headline clusters detected`,
    });
  }

  for (const b of input.breakingCandidates.slice(0, 3)) {
    if (!b.publishedAt && b.breakingScore >= 0.7) {
      recs.push({
        id: nextId(),
        priority: "high",
        action: "Publish breaking alert",
        reason: b.reasons.join("; "),
        articleId: b.articleId,
      });
    }
  }

  for (const a of input.articles) {
    if (a.editorial_status === "pending" && a.viralScore >= 0.72) {
      recs.push({
        id: nextId(),
        priority: "high",
        action: "Fast-track viral story",
        reason: `Viral score ${Math.round(a.viralScore * 100)}% — prioritize review`,
        articleId: a.id,
      });
    }
    if (a.fakeRiskLevel === "critical" || a.fakeRiskLevel === "high") {
      recs.push({
        id: nextId(),
        priority: "high",
        action: "Hold for verification",
        reason: `Misinformation risk: ${a.fakeRiskLevel}`,
        articleId: a.id,
      });
    }
  }

  for (const seo of input.seoOpportunities.slice(0, 4)) {
    if (seo.priority >= 0.6) {
      recs.push({
        id: nextId(),
        priority: "medium",
        action: seo.suggestedAction,
        reason: seo.gap,
        articleId: seo.articleId,
      });
    }
  }

  const priorityOrder = { high: 0, medium: 1, low: 2 };
  return recs
    .sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])
    .slice(0, 18);
}
