import { describe, expect, it } from "vitest";
import {
  isRequiredPathInSitemap,
  normalizeSitemapUrl,
  sitemapUrlForPath,
} from "./sitemap-paths";

describe("sitemap-paths normalization", () => {
  const siteUrl = "https://www.jandarpan.com";

  it("treats homepage with and without trailing slash as equivalent", () => {
    expect(normalizeSitemapUrl("https://www.jandarpan.com")).toBe(
      "https://www.jandarpan.com"
    );
    expect(normalizeSitemapUrl("https://www.jandarpan.com/")).toBe(
      "https://www.jandarpan.com"
    );
    expect(sitemapUrlForPath(siteUrl, "/")).toBe("https://www.jandarpan.com");
  });

  it("does not falsely report / missing when homepage URL exists in sitemap", () => {
    const sitemapUrls = [
      "https://www.jandarpan.com/",
      "https://www.jandarpan.com/search",
      "https://www.jandarpan.com/about",
    ];

    expect(isRequiredPathInSitemap(siteUrl, "/", sitemapUrls)).toBe(true);
  });

  it("matches required paths regardless of trailing slash on non-home URLs", () => {
    const sitemapUrls = ["https://www.jandarpan.com/search/"];

    expect(isRequiredPathInSitemap(siteUrl, "/search", sitemapUrls)).toBe(true);
    expect(isRequiredPathInSitemap(siteUrl, "/missing", sitemapUrls)).toBe(
      false
    );
  });
});
