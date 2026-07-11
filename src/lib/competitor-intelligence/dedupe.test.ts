import { describe, expect, it } from "vitest";
import {
  articleContentFingerprint,
  dedupeParsedArticles,
  hasArticleChanged,
  normalizeCompetitorUrl,
} from "@/lib/competitor-intelligence/dedupe";
import type { ParsedCompetitorArticle } from "@/lib/competitor-intelligence/types";

const sample: ParsedCompetitorArticle = {
  url: "https://www.bhaskar.com/local/chhattisgarh/news/story-123/",
  title: "रायपुर में बारिश",
  description: "भारी बारिश की चेतावनी",
  category: "Chhattisgarh",
  district: "Raipur",
  language: "hi",
  author: "Desk",
  publishedAt: "2026-07-11T08:00:00.000Z",
  image: "https://images.bhaskar.com/1.jpg",
  wordCount: 120,
  headings: ["मुख्य बातें"],
  canonical: "https://www.bhaskar.com/local/chhattisgarh/news/story-123",
};

describe("competitor dedupe", () => {
  it("normalizes trailing slashes and hashes in URLs", () => {
    expect(
      normalizeCompetitorUrl(
        "https://www.patrika.com/news/story/#section"
      )
    ).toBe("https://www.patrika.com/news/story");
  });

  it("deduplicates parsed articles by normalized URL", () => {
    const rows = dedupeParsedArticles([
      sample,
      { ...sample, title: "duplicate url" },
      {
        ...sample,
        url: "https://www.jagran.com/article/abc",
        title: "दूसरी खबर",
      },
    ]);

    expect(rows).toHaveLength(2);
    expect(rows[0]?.url).toBe(
      "https://www.bhaskar.com/local/chhattisgarh/news/story-123"
    );
  });

  it("detects unchanged article fingerprints", () => {
    const fingerprint = articleContentFingerprint(sample);
    expect(fingerprint).toContain("रायपुर में बारिश");
    expect(
      hasArticleChanged(
        {
          title: sample.title,
          description: sample.description ?? null,
          category: sample.category ?? null,
          district: sample.district ?? null,
          author: sample.author ?? null,
          published_at: sample.publishedAt ?? null,
          image: sample.image ?? null,
          word_count: sample.wordCount ?? null,
          headings: sample.headings ?? [],
          canonical: sample.canonical ?? null,
        },
        sample
      )
    ).toBe(false);
  });

  it("detects changed article content", () => {
    expect(
      hasArticleChanged(
        {
          title: sample.title,
          description: sample.description ?? null,
          category: sample.category ?? null,
          district: sample.district ?? null,
          author: sample.author ?? null,
          published_at: sample.publishedAt ?? null,
          image: sample.image ?? null,
          word_count: sample.wordCount ?? null,
          headings: sample.headings ?? [],
          canonical: sample.canonical ?? null,
        },
        { ...sample, title: "अपडेटेड शीर्षक" }
      )
    ).toBe(true);
  });
});
