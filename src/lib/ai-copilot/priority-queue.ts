/**
 * Module 4 — Priority Queue ranking
 */

import type { CopilotPriority, RecommendationDraft } from "@/lib/ai-copilot/types";

const PRIORITY_WEIGHT: Record<CopilotPriority, number> = {
  high: 100,
  medium: 60,
  low: 30,
};

const SOURCE_WEIGHT: Record<string, number> = {
  search_console: 15,
  serp_tracker: 12,
  execution_engine: 10,
  seo_intelligence: 10,
  competitor_intelligence: 8,
  copilot: 5,
};

export function computePriorityScore(draft: RecommendationDraft): number {
  const base = PRIORITY_WEIGHT[draft.priority] ?? 50;
  const confidence = draft.confidence * 20;
  const source = SOURCE_WEIGHT[draft.source] ?? 5;
  const traffic =
    draft.metadata?.clicks != null ? Math.min(Number(draft.metadata.clicks) / 10, 15) : 0;
  const freshness = draft.metadata?.trend === "rising" ? 10 : 0;
  const effort =
    draft.recommended_action.includes("expand") ? -5 : 0;

  return Math.round(base + confidence + source + traffic + freshness + effort);
}

export function rankRecommendations<T extends { priority_score: number }>(
  items: T[]
): T[] {
  return [...items].sort((a, b) => b.priority_score - a.priority_score);
}

export function rankDrafts(drafts: RecommendationDraft[]): Array<RecommendationDraft & { priority_score: number }> {
  return rankRecommendations(
    drafts.map((d) => ({
      ...d,
      priority_score: computePriorityScore(d),
    }))
  );
}
