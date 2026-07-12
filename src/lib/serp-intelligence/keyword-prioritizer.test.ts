import { describe, expect, it } from "vitest";
import {
  buildGapKeywordMap,
  prioritizeKeywords,
  scoreKeyword,
} from "@/lib/serp-intelligence/keyword-prioritizer";
import type { GscQueryRecord } from "@/lib/gsc-intelligence/types";
import type { GapReportRecord } from "@/lib/seo-intelligence/types";
import type { SerpKeywordRecord } from "@/lib/serp-intelligence/types";

const baseKeyword = (
  overrides: Partial<SerpKeywordRecord> = {}
): SerpKeywordRecord => ({
  id: overrides.id ?? "kw-1",
  keyword: overrides.keyword ?? "raipur news",
  group_name: "General",
  language: "hi",
  region: "in",
  enabled: true,
  is_custom: false,
  ...overrides,
});

const gscQuery = (
  overrides: Partial<GscQueryRecord> = {}
): GscQueryRecord => ({
  query: "raipur news",
  clicks: 20,
  impressions: 500,
  ctr: 0.04,
  position: 8,
  trend: "stable",
  ...overrides,
});

describe("keyword-prioritizer", () => {
  it("prioritizes keywords with higher GSC impressions and clicks", () => {
    const keywords = [
      baseKeyword({ id: "low", keyword: "minor topic" }),
      baseKeyword({ id: "high", keyword: "raipur news" }),
    ];

    const ranked = prioritizeKeywords(keywords, {
      gscQueries: [
        gscQuery({ query: "raipur news", impressions: 2000, clicks: 120 }),
        gscQuery({ query: "minor topic", impressions: 20, clicks: 1 }),
      ],
      rankingDrops: new Map(),
      gapKeywords: new Map(),
    });

    expect(ranked[0]?.keyword.id).toBe("high");
    expect(ranked[0]?.priorityScore).toBeGreaterThan(ranked[1]?.priorityScore ?? 0);
  });

  it("boosts rising queries and ranking drops", () => {
    const rising = scoreKeyword(baseKeyword({ keyword: "trending topic" }), {
      gscQueries: [
        gscQuery({
          query: "trending topic",
          trend: "rising",
          position_delta: 4,
          impressions: 300,
          clicks: 15,
        }),
      ],
      rankingDrops: new Map(),
      gapKeywords: new Map(),
    });

    const stable = scoreKeyword(baseKeyword({ keyword: "stable topic" }), {
      gscQueries: [
        gscQuery({
          query: "stable topic",
          trend: "stable",
          impressions: 300,
          clicks: 15,
        }),
      ],
      rankingDrops: new Map(),
      gapKeywords: new Map(),
    });

    expect(rising.priorityScore).toBeGreaterThan(stable.priorityScore);
    expect(rising.signals.gscTrend).toBe("rising");
    expect(rising.signals.rankingDrop).toBe(4);
  });

  it("includes competitor gap importance", () => {
    const gaps: GapReportRecord[] = [
      {
        competitor_article_id: "c1",
        generated_article_id: null,
        generated_article_slug: null,
        gap_type: "missing_story",
        gap_score: 85,
        priority: "high",
        reason: "Competitor published first",
        district: "raipur",
        category: "news",
        keyword: "chhattisgarh election",
      },
    ];

    const scored = scoreKeyword(
      baseKeyword({ keyword: "chhattisgarh election" }),
      {
        gscQueries: [],
        rankingDrops: new Map(),
        gapKeywords: buildGapKeywordMap(gaps),
      }
    );

    expect(scored.signals.competitorGapScore).toBe(85);
    expect(scored.priorityScore).toBeGreaterThan(0);
  });

  it("uses SERP ranking drops when GSC data is missing", () => {
    const scored = scoreKeyword(baseKeyword({ id: "kw-drop" }), {
      gscQueries: [],
      rankingDrops: new Map([["kw-drop", 6]]),
      gapKeywords: new Map(),
    });

    expect(scored.signals.rankingDrop).toBe(6);
    expect(scored.priorityScore).toBeGreaterThan(0);
  });
});
