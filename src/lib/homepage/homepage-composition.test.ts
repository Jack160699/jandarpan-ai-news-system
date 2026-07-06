import { describe, expect, it } from "vitest";
import type { RankedArticleOutput } from "@/lib/news/ai/ranking";
import type { GeneratedArticleRow } from "@/lib/types/newsroom";
import type { HomeArticle } from "@/lib/homepage/types";
import {
  composeHomepageSlots,
  countHomepageDuplicates,
  homepageDiversityScore,
  isRoundupArticle,
} from "@/lib/homepage/homepage-composition";

function mockArticle(
  id: string,
  headline: string,
  overrides: Partial<HomeArticle> = {}
): HomeArticle {
  return {
    id,
    slug: id,
    headline,
    summary: `Summary for ${headline}`,
    imageUrl: "https://example.com/a.jpg",
    ogImageUrl: "https://example.com/a.jpg",
    section: "chhattisgarh",
    readingTime: "1 min",
    publishedAt: new Date().toISOString(),
    isLive: true,
    urgency: "high",
    trendScore: 80,
    priorityScore: 80,
    ranking: {
      priorityScore: 80,
      reasons: [],
      isTrending: true,
      isBreaking: true,
      duplicateClusterId: null,
    },
    language: "hi",
    tags: [],
    aiConfidence: 0.8,
    sourceCount: 2,
    categoryLabel: "CG",
    desk: { id: "regional-bureau", name: "Regional Bureau", nameHi: "क्षेत्रीय" },
    ...overrides,
  };
}

function mockRow(id: string, headline: string, eventId?: string): GeneratedArticleRow {
  return {
    id,
    slug: id,
    headline,
    summary: headline,
    article_body: headline,
    hero_image_url: "https://example.com/a.jpg",
    language: "hi",
    tags: ["local"],
    published_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    editorial_status: "approved",
    event_id: eventId ?? null,
    editorial_metadata: { ai_confidence: 0.8 },
  } as GeneratedArticleRow;
}

function toRankedOutput(row: GeneratedArticleRow): RankedArticleOutput {
  return {
    row,
    section: "chhattisgarh",
    ranking: {
      priorityScore: 80,
      factors: {
        freshness: 20,
        urgency: 10,
        regional: 20,
        districtBoost: 8,
        sourceTrust: 10,
        engagement: 8,
        category: 10,
        breakingBoost: 10,
        staleDecay: 0,
        duplicatePenalty: 0,
      },
      reasons: [],
      isTrending: true,
      isBreaking: true,
      duplicateClusterId: null,
      rankedAt: new Date().toISOString(),
    },
  };
}

describe("homepage composition", () => {
  it("detects roundup articles", () => {
    expect(isRoundupArticle(mockArticle("1", "10 Major News from Chhattisgarh"))).toBe(
      true
    );
    expect(isRoundupArticle(mockArticle("2", "Korba power outage"))).toBe(false);
  });

  it("keeps hero unique across sections", () => {
    const articles = [
      mockArticle("hero", "Gwalior incident"),
      mockArticle("b1", "Gwalior incident update", {
        ranking: {
          priorityScore: 75,
          reasons: [],
          isTrending: true,
          isBreaking: true,
          duplicateClusterId: "dup-0",
        },
      }),
      mockArticle("b2", "Raipur cabinet meet", { section: "raipur" }),
      mockArticle("b3", "Bastar security alert"),
      mockArticle("t1", "Monsoon warning"),
      mockArticle("t2", "Youth congress change"),
      mockArticle("d1", "Bilaspur road fight", { section: "raipur" }),
      mockArticle("g1", "PM Modi tour", { section: "india" }),
    ];

    const outputs = articles.map((a) => toRankedOutput(mockRow(a.id, a.headline)));
    const slots = composeHomepageSlots(articles, outputs);

    expect(slots.hero.id).not.toBe("b1");
    expect(slots.breakingTicker.every((a) => a.id !== slots.hero.id)).toBe(true);
    expect(slots.trending.every((a) => a.id !== slots.hero.id)).toBe(true);
    expect(slots.districtWire.every((a) => a.id !== slots.hero.id)).toBe(true);
  });

  it("suppresses duplicate event siblings", () => {
    const articles = [
      mockArticle("a", "Amarnath Yatra begins"),
      mockArticle("b", "Amarnath Yatra begins today", {
        priorityScore: 70,
        ranking: {
          priorityScore: 70,
          reasons: [],
          isTrending: false,
          isBreaking: false,
          duplicateClusterId: null,
        },
      }),
      mockArticle("c", "Raipur development"),
    ];
    const outputs = [
      toRankedOutput(mockRow("a", articles[0].headline, "event-1")),
      toRankedOutput(mockRow("b", articles[1].headline, "event-1")),
      toRankedOutput(mockRow("c", articles[2].headline)),
    ];

    const slots = composeHomepageSlots(articles, outputs);
    const visible = [
      slots.hero.id,
      ...slots.breakingTicker.map((a) => a.id),
      ...slots.trending.map((a) => a.id),
    ];
    const amarnathCount = visible.filter((id) => id === "a" || id === "b").length;
    expect(amarnathCount).toBeLessThanOrEqual(1);
  });

  it("improves diversity score vs duplicated feed", () => {
    const hero = mockArticle("h", "Lead story");
    const dupe = mockArticle("d", "Lead story copy");

    const badFeed = {
      editorsPicks: { lead: hero, supporting: [dupe] },
      breakingTicker: [hero, dupe],
      trending: [hero],
      liveWire: [dupe],
      regionalHighlights: [hero],
      newsShorts: [{ articleId: hero.id }],
    };

    expect(countHomepageDuplicates(badFeed)).toBeGreaterThan(0);
    expect(homepageDiversityScore(badFeed)).toBeLessThan(100);
  });
});
