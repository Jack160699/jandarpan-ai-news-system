import { describe, expect, it } from "vitest";
import {
  buildRankingUpdate,
  detectMovementType,
  detectLostRankings,
  computeVisibilityScore,
  computeAveragePosition,
} from "@/lib/serp-intelligence/rank-tracker";

describe("rank-tracker", () => {
  const capturedAt = "2026-07-11T06:00:00.000Z";

  it("detects movement types", () => {
    expect(detectMovementType(null, 5)).toBe("new_ranking");
    expect(detectMovementType(5, null)).toBe("lost_ranking");
    expect(detectMovementType(8, 4)).toBe("improved_ranking");
    expect(detectMovementType(3, 7)).toBe("dropped_ranking");
    expect(detectMovementType(4, 4)).toBe("unchanged");
  });

  it("builds ranking update with movement", () => {
    const { ranking, movement } = buildRankingUpdate(
      "kw-1",
      {
        position: 4,
        title: "Story",
        url: "https://jandarpan.news/a",
        snippet: "snippet",
        domain: "jandarpan.news",
      },
      {
        url: "https://jandarpan.news/a",
        domain: "jandarpan.news",
        position: 8,
        title: "Old",
        snippet: "s",
        site: null,
        publish_date: null,
        is_jandarpan: true,
        competitor_key: null,
        first_seen: capturedAt,
        best_rank: 8,
        worst_rank: 8,
        ranking_history: [],
      },
      capturedAt
    );

    expect(ranking.position).toBe(4);
    expect(ranking.best_rank).toBe(4);
    expect(movement?.movement_type).toBe("improved_ranking");
    expect(movement?.position_delta).toBe(4);
  });

  it("detects lost rankings", () => {
    const lost = detectLostRankings(
      "kw-1",
      [
        {
          url: "https://old.com/x",
          domain: "old.com",
          position: 6,
          title: null,
          snippet: null,
          site: null,
          publish_date: null,
          is_jandarpan: false,
          competitor_key: null,
          first_seen: capturedAt,
          best_rank: 6,
          worst_rank: 6,
          ranking_history: [],
        },
      ],
      new Set(["https://new.com/y"]),
      capturedAt
    );
    expect(lost).toHaveLength(1);
    expect(lost[0].movement_type).toBe("lost_ranking");
  });

  it("computes visibility score", () => {
    expect(computeVisibilityScore([1, 5, null, 10])).toBe(43);
    expect(computeVisibilityScore([])).toBe(0);
  });

  it("computes average position", () => {
    expect(computeAveragePosition([3, 7, null])).toBe(5);
    expect(computeAveragePosition([null, null])).toBeNull();
  });
});
