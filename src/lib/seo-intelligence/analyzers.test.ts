import { describe, expect, it } from "vitest";
import { analyzeHeadline } from "@/lib/seo-intelligence/headline-analyzer";
import { buildKeywordIntelligence } from "@/lib/seo-intelligence/keywords";
import { scoreJandarpanArticle } from "@/lib/seo-intelligence/scorecard";
import type { AnalysisCompetitorArticle } from "@/lib/seo-intelligence/types";

describe("keyword intelligence", () => {
  it("extracts and ranks keywords from competitor titles", () => {
    const articles: AnalysisCompetitorArticle[] = [
      {
        id: "1",
        source_id: "s",
        source_name: "Patrika",
        url: "https://a.com/1",
        title: "रायपुर बारिश मौसम चेतावनी",
        description: "रायपुर में भारी बारिश",
        category: null,
        district: "raipur",
        published_at: "2026-07-11T08:00:00.000Z",
        fetched_at: "2026-07-11T08:00:00.000Z",
        word_count: 100,
        headings: [],
        open_graph: {},
        schema_detected: {},
      },
      {
        id: "2",
        source_id: "s",
        source_name: "Jagran",
        url: "https://a.com/2",
        title: "रायपुर बारिश अपडेट",
        description: null,
        category: null,
        district: "raipur",
        published_at: "2026-07-11T09:00:00.000Z",
        fetched_at: "2026-07-11T09:00:00.000Z",
        word_count: 80,
        headings: [],
        open_graph: {},
        schema_detected: {},
      },
    ];

    const keywords = buildKeywordIntelligence(articles);
    expect(keywords.length).toBeGreaterThan(0);
    expect(keywords[0]?.competitors_using.length).toBeGreaterThan(0);
  });
});

describe("headline analyzer", () => {
  it("scores breaking question headlines higher", () => {
    const basic = analyzeHeadline("छत्तीसगढ़ समाचार अपडेट");
    const strong = analyzeHeadline(
      "ब्रेकिंग: रायपुर में बारिश — क्या आप तैयार हैं?"
    );
    expect(strong.headlineScore).toBeGreaterThanOrEqual(basic.headlineScore);
    expect(strong.ctrPrediction).toBeGreaterThanOrEqual(basic.ctrPrediction);
  });
});

describe("seo scorecard", () => {
  it("returns 0-100 scores for jandarpan articles", () => {
    const card = scoreJandarpanArticle({
      id: "j1",
      slug: "test-story",
      headline: "रायपुर में बड़ी खबर: नई योजना की घोषणा",
      summary:
        "रायपुर में सरकार ने नई योजना की घोषणा की है जिससे हजारों लाभान्वित होंगे। यह योजना शिक्षा और स्वास्थ्य पर केंद्रित है।",
      seo_title: "रायपुर योजना घोषणा",
      seo_description:
        "रायपुर में नई सरकारी योजना की घोषणा, शिक्षा और स्वास्थ्य लाभ के साथ।",
      tags: ["raipur", "scheme"],
      published_at: "2026-07-11T08:00:00.000Z",
      district: "raipur",
      category: "politics",
      word_count: 320,
      hero_image_url: "https://cdn.example.com/img.jpg",
      editorial_metadata: { related_slugs: ["other"] },
    });

    expect(card.seoScore).toBeGreaterThanOrEqual(0);
    expect(card.seoScore).toBeLessThanOrEqual(100);
    expect(card.imageOptimization).toBeGreaterThan(50);
  });
});
