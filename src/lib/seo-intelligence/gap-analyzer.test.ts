import { describe, expect, it } from "vitest";
import { analyzeContentGaps } from "@/lib/seo-intelligence/gap-analyzer";
import type {
  AnalysisCompetitorArticle,
  AnalysisJandarpanArticle,
} from "@/lib/seo-intelligence/types";

const competitor: AnalysisCompetitorArticle = {
  id: "c1",
  source_id: "s1",
  source_name: "Dainik Bhaskar",
  url: "https://example.com/story-1",
  title: "रायपुर में भारी बारिश की चेतावनी जारी",
  description: "मौसम विभाग ने अलर्ट जारी किया",
  category: "weather",
  district: "raipur",
  published_at: "2026-07-11T08:00:00.000Z",
  fetched_at: "2026-07-11T08:05:00.000Z",
  word_count: 200,
  headings: ["मुख्य बातें", "FAQ"],
  open_graph: {},
  schema_detected: {},
};

const jandarpanMatch: AnalysisJandarpanArticle = {
  id: "j1",
  slug: "raipur-barish-alert",
  headline: "रायपुर में भारी बारिश की चेतावनी",
  summary: "मौसम विभाग की चेतावनी",
  seo_title: null,
  seo_description: null,
  tags: ["weather"],
  published_at: "2026-07-11T07:00:00.000Z",
  district: "raipur",
  category: "weather",
  word_count: 250,
  hero_image_url: "https://cdn.example.com/a.jpg",
  editorial_metadata: {},
};

describe("content gap analyzer", () => {
  it("flags missing story when similarity is low", () => {
    const gaps = analyzeContentGaps(
      [
        {
          ...competitor,
          title: "बिलासपुर में नई सरकारी योजना की घोषणा",
          district: "bilaspur",
        },
      ],
      [jandarpanMatch]
    );
    expect(gaps.some((g) => g.gap_type === "missing_story")).toBe(true);
  });

  it("flags duplicate topic for near-identical headlines", () => {
    const gaps = analyzeContentGaps([competitor], [jandarpanMatch]);
    expect(
      gaps.some(
        (g) => g.gap_type === "duplicate_topic" || g.gap_type === "similar_story"
      )
    ).toBe(true);
  });

  it("flags missing district coverage", () => {
    const gaps = analyzeContentGaps(
      [{ ...competitor, district: "korba" }],
      [{ ...jandarpanMatch, district: "raipur" }]
    );
    expect(gaps.some((g) => g.gap_type === "missing_district")).toBe(true);
  });
});
