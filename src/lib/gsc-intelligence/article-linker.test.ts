import { describe, expect, it } from "vitest";
import {
  detectCategoryInText,
  extractSlugFromPageUrl,
  linkQueryToArticle,
} from "@/lib/gsc-intelligence/article-linker";
import type { ArticleLinkHint } from "@/lib/gsc-intelligence/types";

const articles: ArticleLinkHint[] = [
  {
    id: "a1",
    slug: "raipur-barish-alert",
    headline: "रायपुर में भारी बारिश की चेतावनी",
    tags: ["weather"],
    district: "raipur",
    url: "https://www.jandarpan.news/news/raipur-barish-alert",
  },
];

describe("article-linker", () => {
  it("extracts slug from page URL", () => {
    expect(
      extractSlugFromPageUrl(
        "https://www.jandarpan.news/news/raipur-barish-alert"
      )
    ).toBe("raipur-barish-alert");
  });

  it("detects category in query text", () => {
    expect(detectCategoryInText("छत्तीसगढ़ मौसम अपडेट")).toBe("weather");
    expect(detectCategoryInText("random text")).toBeNull();
  });

  it("links query to article by district/keywords", () => {
    const link = linkQueryToArticle("रायपुर बारिश", articles);
    expect(link.district).toBe("raipur");
    expect(link.slug).toBe("raipur-barish-alert");
  });
});
