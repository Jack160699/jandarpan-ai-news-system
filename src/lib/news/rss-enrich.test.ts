import { describe, expect, it } from "vitest";
import { extractArticleMetadataFromHtml } from "@/lib/news/rss-enrich";

function htmlWithOgTitle(title: string): string {
  return `<html><head><meta property="og:title" content="${title}" /></head><body></body></html>`;
}

describe("extractArticleMetadataFromHtml", () => {
  it("returns the scraped og:title when it looks like a real headline", () => {
    const meta = extractArticleMetadataFromHtml(
      htmlWithOgTitle("Rajnandgaon farmers welcome new irrigation scheme")
    );
    expect(meta.title).toBe("Rajnandgaon farmers welcome new irrigation scheme");
  });

  it("drops the scraped title when it is Google News's generic interstitial title", () => {
    // Google News RSS <link> values are redirect wrappers, not the publisher
    // URL — fetching them can land on a Google-branded page whose og:title
    // is just "Google समाचार" (the feed's own name), not the real headline.
    const meta = extractArticleMetadataFromHtml(htmlWithOgTitle("Google समाचार"));
    expect(meta.title).toBeUndefined();
  });

  it("drops the scraped title when it is the English 'Google News' variant", () => {
    const meta = extractArticleMetadataFromHtml(htmlWithOgTitle("Google News"));
    expect(meta.title).toBeUndefined();
  });

  it("is case-insensitive when matching the generic placeholder", () => {
    const meta = extractArticleMetadataFromHtml(htmlWithOgTitle("GOOGLE NEWS"));
    expect(meta.title).toBeUndefined();
  });
});
