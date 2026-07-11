import { describe, expect, it } from "vitest";
import { auditArticle } from "@/lib/seo-execution/article-audit";
import type { ExecutionArticle, IntelligenceContext } from "@/lib/seo-execution/types";

const article: ExecutionArticle = {
  id: "a1",
  slug: "raipur-news",
  headline: "रायपुर में भारी बारिश की चेतावनी",
  summary: "मौसम विभाग ने अलर्ट जारी किया है।",
  seo_title: null,
  seo_description: null,
  article_body: "विस्तृत रिपोर्ट " + "शब्द ".repeat(80),
  hero_image_url: "https://cdn.example.com/img.jpg",
  tags: ["weather", "raipur"],
  district: "raipur",
  category: "weather",
  published_at: "2026-07-11T08:00:00.000Z",
  editorial_metadata: {},
  word_count: 80,
};

const context: IntelligenceContext = {
  competitorHeadlines: ["रायपुर बारिश अपडेट"],
  seoGaps: ["Missing weather keyword"],
  serpOpportunities: [],
  gscQueries: [{ query: "raipur barish", clicks: 50, position: 6 }],
};

describe("article-audit", () => {
  it("computes audit scores with explanations", () => {
    const scores = auditArticle(article, context);
    expect(scores.overallScore).toBeGreaterThan(0);
    expect(scores.overallScore).toBeLessThanOrEqual(100);
    expect(scores.explanations.seoScore).toBeTruthy();
    expect(scores.googleNewsScore).toBeGreaterThan(0);
  });
});
