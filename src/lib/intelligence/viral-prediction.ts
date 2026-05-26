/**
 * Viral prediction — engagement velocity + editorial signals
 */

import type { ViralPrediction } from "@/lib/intelligence/types";

type ArticleInput = {
  id: string;
  slug: string;
  headline: string;
  summary: string | null;
  published_at: string | null;
  created_at: string;
  is_breaking?: boolean;
  ai_confidence?: number | null;
  source_count?: number | null;
  views?: number;
  clicks?: number;
};

export function predictViralSpread(articles: ArticleInput[]): ViralPrediction[] {
  return articles
    .map((a) => {
      const hours = hoursSince(a.published_at ?? a.created_at);
      const views = a.views ?? 0;
      const clicks = a.clicks ?? 0;
      const ctr = views > 0 ? clicks / views : 0;

      let viralScore = 0.15;
      let shareVelocity = 0;

      if (hours <= 3) viralScore += 0.2;
      else if (hours <= 12) viralScore += 0.1;

      if (a.is_breaking) viralScore += 0.22;
      if ((a.ai_confidence ?? 0) >= 0.75) viralScore += 0.12;
      if ((a.source_count ?? 0) >= 3) viralScore += 0.1;

      const engagementPotential = Math.min(
        1,
        ctr * 2 + (views > 50 ? 0.25 : views / 200) + (a.ai_confidence ?? 0.4) * 0.3
      );

      if (views > 0 && hours > 0) {
        shareVelocity = Math.min(1, (views + clicks * 3) / (hours * 40));
      } else {
        shareVelocity = viralScore * 0.6;
      }

      viralScore = viralScore * 0.55 + engagementPotential * 0.25 + shareVelocity * 0.2;
      viralScore = Math.round(Math.min(1, viralScore) * 1000) / 1000;

      const hoursToPeak =
        viralScore >= 0.65 ? Math.max(2, Math.round(18 - viralScore * 12)) : null;

      return {
        articleId: a.id,
        slug: a.slug,
        headline: a.headline,
        viralScore,
        shareVelocity: Math.round(shareVelocity * 1000) / 1000,
        engagementPotential: Math.round(engagementPotential * 1000) / 1000,
        hoursToPeak,
      };
    })
    .sort((a, b) => b.viralScore - a.viralScore)
    .slice(0, 15);
}

function hoursSince(iso: string): number {
  return Math.max(0, (Date.now() - new Date(iso).getTime()) / 3_600_000);
}
