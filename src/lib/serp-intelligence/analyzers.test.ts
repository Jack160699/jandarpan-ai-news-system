import { describe, expect, it } from "vitest";
import { computeCompetitorShare } from "@/lib/serp-intelligence/competitor-share";
import { synthesizeAiActions } from "@/lib/serp-intelligence/ai-actions";
import type { SerpOpportunityRecord } from "@/lib/serp-intelligence/types";

describe("competitor-share", () => {
  it("computes share of top 10", () => {
    const stats = computeCompetitorShare(
      [
        { domain: "bhaskar.com", position: 1, position_delta: 0 },
        { domain: "bhaskar.com", position: 3, position_delta: 1 },
        { domain: "patrika.com", position: 5, position_delta: null },
      ],
      10
    );

    const bhaskar = stats.find((s) => s.domain === "bhaskar.com");
    expect(bhaskar?.top10_count).toBe(2);
    expect(bhaskar?.share_top10).toBe(20);
    expect(bhaskar?.top3_count).toBe(2);
  });
});

describe("ai-actions", () => {
  it("synthesizes deduplicated actions", () => {
    const opps: SerpOpportunityRecord[] = [
      {
        keyword_id: "k1",
        opportunity_type: "striking_distance",
        action_type: "expand_article",
        priority: "high",
        title: "Expand",
        reason: "Rank 6",
        current_position: 6,
      },
      {
        keyword_id: "k1",
        opportunity_type: "ctr_opportunity",
        action_type: "improve_title",
        priority: "medium",
        title: "Title",
        reason: "CTR",
      },
    ];

    const actions = synthesizeAiActions(
      opps,
      new Map([["k1", "Raipur news"]])
    );
    expect(actions).toHaveLength(2);
    expect(actions[0].priority).toBe("high");
    expect(actions[0].keyword).toBe("Raipur news");
  });
});
