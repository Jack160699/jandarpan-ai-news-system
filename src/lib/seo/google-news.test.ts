import { describe, expect, it } from "vitest";
import {
  buildEmptyGoogleNewsSitemapXml,
  buildGoogleNewsSitemapXml,
  getGoogleNewsCutoffIso,
  GOOGLE_NEWS_PUBLICATION_NAME,
  GOOGLE_NEWS_WINDOW_HOURS,
  isWithinGoogleNewsWindow,
  resolveGoogleNewsLanguage,
  toGoogleNewsEntry,
} from "@/lib/seo/google-news";

const FIXED_NOW = new Date("2026-07-11T10:00:00.000Z");

describe("google-news sitemap", () => {
  it("accepts articles inside the 48-hour window", () => {
    const publishedAt = "2026-07-10T12:00:00.000Z";
    expect(isWithinGoogleNewsWindow(publishedAt, FIXED_NOW)).toBe(true);
    expect(
      toGoogleNewsEntry(
        {
          slug: "sample-story-slug",
          headline: "नमूना शीर्षक",
          publishedAt,
          language: "hi",
        },
        FIXED_NOW
      )
    ).toMatchObject({
      loc: expect.stringContaining("/story/sample-story-slug"),
      publicationDate: publishedAt,
      title: "नमूना शीर्षक",
      language: "hi",
    });
  });

  it("rejects articles outside the 48-hour window", () => {
    const publishedAt = "2026-07-07T08:45:49.203Z";
    expect(isWithinGoogleNewsWindow(publishedAt, FIXED_NOW)).toBe(false);
    expect(
      toGoogleNewsEntry(
        {
          slug: "old-story",
          headline: "पुरानी खबर",
          publishedAt,
          language: "hi",
        },
        FIXED_NOW
      )
    ).toBeNull();
  });

  it("maps cg language to hi for Google News", () => {
    expect(resolveGoogleNewsLanguage("cg")).toBe("hi");
    expect(resolveGoogleNewsLanguage("en")).toBe("en");
  });

  it("builds valid Google News XML with required tags", () => {
    const xml = buildGoogleNewsSitemapXml([
      {
        loc: "https://www.jandarpan.news/story/test-article",
        publicationDate: "2026-07-10T12:00:00.000Z",
        title: "Test headline",
        language: "hi",
      },
    ]);

    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(xml).toContain('xmlns:news="http://www.google.com/schemas/sitemap-news/0.9"');
    expect(xml).toContain("<url>");
    expect(xml).toContain("<loc>https://www.jandarpan.news/story/test-article</loc>");
    expect(xml).toContain("<news:news>");
    expect(xml).toContain("<news:publication>");
    expect(xml).toContain(
      `<news:name>${GOOGLE_NEWS_PUBLICATION_NAME}</news:name>`
    );
    expect(xml).toContain("<news:language>hi</news:language>");
    expect(xml).toContain(
      "<news:publication_date>2026-07-10T12:00:00.000Z</news:publication_date>"
    );
    expect(xml).toContain("<news:title>Test headline</news:title>");
    expect(xml).toContain("</url>");
    expect(xml).toContain("</urlset>");
  });

  it("escapes XML entities in titles and URLs", () => {
    const xml = buildGoogleNewsSitemapXml([
      {
        loc: "https://www.jandarpan.news/story/a&b",
        publicationDate: "2026-07-10T12:00:00.000Z",
        title: `A & B "quotes"`,
        language: "en",
      },
    ]);

    expect(xml).toContain("<loc>https://www.jandarpan.news/story/a&amp;b</loc>");
    expect(xml).toContain('<news:title>A &amp; B &quot;quotes&quot;</news:title>');
    expect(xml).toContain("<news:language>en</news:language>");
  });

  it("returns a valid empty urlset with an explanatory comment", () => {
    const xml = buildEmptyGoogleNewsSitemapXml();
    expect(xml).toContain("</urlset>");
    expect(xml).not.toContain("<url>");
    expect(xml).toContain(`last ${GOOGLE_NEWS_WINDOW_HOURS} hours`);
  });

  it("computes a rolling 48-hour cutoff", () => {
    const cutoff = getGoogleNewsCutoffIso(FIXED_NOW);
    expect(cutoff).toBe("2026-07-09T10:00:00.000Z");
  });
});
