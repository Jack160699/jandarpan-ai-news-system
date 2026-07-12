import { describe, expect, it } from "vitest";
import {
  extractDomain,
  isJandarpanDomain,
  parseSerpApiResponse,
  buildSnapshotFromOrganic,
} from "@/lib/serp-intelligence/parser";

describe("parser", () => {
  it("extracts domain from URL", () => {
    expect(extractDomain("https://www.jandarpan.news/story")).toBe(
      "jandarpan.news"
    );
    expect(extractDomain("https://www.bhaskar.com/news")).toBe("bhaskar.com");
  });

  it("detects Jandarpan domain", () => {
    expect(isJandarpanDomain("jandarpan.news")).toBe(true);
    expect(isJandarpanDomain("www.jandarpan.news")).toBe(true);
    expect(isJandarpanDomain("bhaskar.com")).toBe(false);
  });

  it("parses SerpAPI organic results", () => {
    const data = {
      organic_results: [
        {
          position: 1,
          title: "Test headline",
          link: "https://www.bhaskar.com/a",
          snippet: "Short snippet",
        },
        {
          position: 2,
          title: "Jandarpan story",
          link: "https://www.jandarpan.news/b",
          snippet: "Our coverage",
        },
      ],
      related_questions: [{ question: "What happened?" }],
      top_stories: [{ link: "https://news18.com/x" }],
    };

    const snapshot = parseSerpApiResponse("Raipur news", data);
    expect(snapshot.organic_results).toHaveLength(2);
    expect(snapshot.organic_results[1].domain).toBe("jandarpan.news");
    expect(snapshot.serp_features.people_also_ask).toBe(true);
    expect(snapshot.serp_features.top_stories).toBe(true);
  });

  it("builds test snapshot from organic rows", () => {
    const snapshot = buildSnapshotFromOrganic("test", [
      {
        position: 5,
        title: "T",
        url: "https://jandarpan.news/x",
        snippet: "s",
        domain: "jandarpan.news",
      },
    ]);
    expect(snapshot.organic_results[0].position).toBe(5);
  });
});
