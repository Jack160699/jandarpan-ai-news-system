import { describe, expect, it } from "vitest";
import { parseRssItemToCompetitorArticle } from "@/lib/competitor-intelligence/parser";

describe("competitor parser", () => {
  it("parses RSS item fields into competitor article shape", () => {
    const article = parseRssItemToCompetitorArticle(
      {
        title: "छत्तीसगढ़ में बारिश",
        link: "https://www.tv9hindi.com/india/chhattisgarh-rain-alert-123",
        pubDate: "Sat, 11 Jul 2026 08:30:00 GMT",
        creator: "TV9 Desk",
        categories: ["Chhattisgarh"],
        contentSnippet: "मौसम विभाग ने चेतावनी जारी की",
        enclosure: { url: "https://static.tv9hindi.com/img.jpg" },
      },
      { language: "hi", sourceName: "TV9 Bharatvarsh" }
    );

    expect(article).toMatchObject({
      title: "छत्तीसगढ़ में बारिश",
      url: "https://www.tv9hindi.com/india/chhattisgarh-rain-alert-123",
      author: "TV9 Desk",
      category: "Chhattisgarh",
      language: "hi",
      image: "https://static.tv9hindi.com/img.jpg",
    });
    expect(article?.publishedAt).toBeTruthy();
    expect(article?.metadata?.sourceName).toBe("TV9 Bharatvarsh");
  });

  it("returns null when title or link is missing", () => {
    expect(
      parseRssItemToCompetitorArticle({ title: "Only title" }, {})
    ).toBeNull();
    expect(
      parseRssItemToCompetitorArticle({ link: "https://example.com" }, {})
    ).toBeNull();
  });
});
