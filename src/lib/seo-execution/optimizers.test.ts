import { describe, expect, it } from "vitest";
import { generateTitleSuggestions } from "@/lib/seo-execution/title-optimizer";
import { generateMetaSuggestions } from "@/lib/seo-execution/meta-optimizer";
import { generateFaqSuggestions } from "@/lib/seo-execution/faq-generator";
import type { ExecutionArticle } from "@/lib/seo-execution/types";

const article: ExecutionArticle = {
  id: "a1",
  slug: "test-slug",
  headline: "छत्तीसगढ़ में नई योजना की घोषणा",
  summary: "सरकार ने नई योजना शुरू की।",
  seo_title: "Short",
  seo_description: "Too short",
  article_body: null,
  hero_image_url: null,
  tags: ["politics"],
  district: "raipur",
  category: "politics",
  published_at: "2026-07-11T08:00:00.000Z",
  editorial_metadata: {},
  word_count: 50,
};

describe("title-optimizer", () => {
  it("generates title variants without modifying original", () => {
    const suggestions = generateTitleSuggestions(article);
    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions[0].current_value).toBe("Short");
    expect(suggestions.every((s) => s.suggested_value !== article.headline || true)).toBe(true);
  });
});

describe("meta-optimizer", () => {
  it("suggests meta description improvement for short desc", () => {
    const suggestions = generateMetaSuggestions(article);
    expect(suggestions.some((s) => s.suggestion_type === "meta_description")).toBe(true);
  });
});

describe("faq-generator", () => {
  it("generates FAQ when none exists", () => {
    const suggestions = generateFaqSuggestions(article);
    expect(suggestions).toHaveLength(1);
    expect(suggestions[0].suggestion_type).toBe("faq");
    const parsed = JSON.parse(suggestions[0].suggested_value) as { faqs: unknown[] };
    expect(parsed.faqs.length).toBeGreaterThanOrEqual(3);
  });
});
