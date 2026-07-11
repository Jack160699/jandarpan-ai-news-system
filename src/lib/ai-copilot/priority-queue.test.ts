import { describe, expect, it } from "vitest";
import { computePriorityScore, rankDrafts } from "@/lib/ai-copilot/priority-queue";
import type { RecommendationDraft } from "@/lib/ai-copilot/types";

describe("priority-queue", () => {
  it("ranks high priority drafts first", () => {
    const drafts: RecommendationDraft[] = [
      {
        external_key: "a",
        source: "seo_intelligence",
        priority: "low",
        confidence: 0.5,
        title: "Low",
        reason: "r",
        recommended_action: "act",
      },
      {
        external_key: "b",
        source: "search_console",
        priority: "high",
        confidence: 0.9,
        title: "High",
        reason: "r",
        recommended_action: "act",
        metadata: { clicks: 100, trend: "rising" },
      },
    ];
    const ranked = rankDrafts(drafts);
    expect(ranked[0].title).toBe("High");
    expect(ranked[0].priority_score).toBeGreaterThan(ranked[1].priority_score);
  });

  it("computes priority score components", () => {
    const score = computePriorityScore({
      external_key: "x",
      source: "serp_tracker",
      priority: "medium",
      confidence: 0.8,
      title: "t",
      reason: "r",
      recommended_action: "expand_article",
    });
    expect(score).toBeGreaterThan(50);
  });
});
