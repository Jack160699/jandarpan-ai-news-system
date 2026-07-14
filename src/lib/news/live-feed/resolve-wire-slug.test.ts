import { describe, expect, it } from "vitest";
import { buildArticleSlug } from "@/lib/news/slug";
import type { NormalizedArticle } from "@/lib/news/types";
import { wireArticlesToGeneratedPool } from "@/lib/news/live-feed/wire-to-generated";

describe("wire slug resolution", () => {
  it("builds stable slugs that round-trip through generated pool", () => {
    const article: NormalizedArticle = {
      title: "Raipur metro update",
      description: "टेस्ट सारांश",
      content: "टेस्ट बॉडी",
      article_url: "https://example.com/raipur-metro-story",
      image_url: "https://staticimg.amarujala.com/test.jpg",
      provider: "gnews",
      source: "wire",
      author: null,
      published_at: "2026-07-13T08:00:00.000Z",
      language: "hi",
      region: "india",
      category: "local",
    };

    const [row] = wireArticlesToGeneratedPool([article], 1);
    expect(row.slug).toBeTruthy();
    expect(buildArticleSlug(article.title, row.id, article.article_url)).toBe(row.slug);
  });
});
