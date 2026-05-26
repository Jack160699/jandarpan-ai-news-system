/**
 * Breaking news detector — urgency + editorial signals
 */

import { scoreBreaking } from "@/lib/news/ai/editorial-intelligence";
import type { BreakingCandidate } from "@/lib/intelligence/types";
import type { NewsEventRow } from "@/lib/types/newsroom";

type ArticleInput = {
  id: string;
  headline: string;
  summary: string | null;
  published_at: string | null;
  is_breaking?: boolean;
  event?: NewsEventRow | null;
};

const BREAKING_THRESHOLD = 0.58;

export function detectBreakingCandidates(articles: ArticleInput[]): BreakingCandidate[] {
  return articles
    .map((a) => {
      const breakingScore = scoreBreaking({
        headline: a.headline,
        summary: a.summary ?? "",
        event: a.event ?? null,
        publishedAt: a.published_at,
      });

      const reasons: string[] = [];
      if (a.is_breaking) reasons.push("flagged_breaking");
      if (breakingScore >= 0.7) reasons.push("high_breaking_score");
      if ((a.event?.urgency_score ?? 0) >= 0.7) reasons.push("event_urgency");
      if (/\b(breaking|live|urgent|ब्रेकिंग|लाइव)\b/i.test(a.headline)) {
        reasons.push("headline_signal");
      }

      const urgencyScore = a.event?.urgency_score ?? breakingScore * 0.8;

      return {
        articleId: a.id,
        headline: a.headline,
        breakingScore,
        urgencyScore: Math.round(urgencyScore * 1000) / 1000,
        publishedAt: a.published_at,
        reasons,
      };
    })
    .filter(
      (c) =>
        c.breakingScore >= BREAKING_THRESHOLD ||
        c.reasons.includes("flagged_breaking")
    )
    .sort((a, b) => b.breakingScore - a.breakingScore)
    .slice(0, 12);
}
