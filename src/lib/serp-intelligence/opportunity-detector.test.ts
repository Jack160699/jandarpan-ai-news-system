import { describe, expect, it } from "vitest";
import { detectOpportunities } from "@/lib/serp-intelligence/opportunity-detector";
import { buildSnapshotFromOrganic } from "@/lib/serp-intelligence/parser";

describe("opportunity-detector", () => {
  it("detects striking distance opportunity", () => {
    const snapshot = buildSnapshotFromOrganic("Raipur news", [
      {
        position: 1,
        title: "Competitor",
        url: "https://bhaskar.com/a",
        snippet: "x".repeat(100),
        domain: "bhaskar.com",
      },
      {
        position: 6,
        title: "Jandarpan",
        url: "https://jandarpan.news/b",
        snippet: "Our story",
        domain: "jandarpan.news",
      },
    ]);

    const opps = detectOpportunities("kw-1", snapshot);
    const striking = opps.find((o) => o.opportunity_type === "striking_distance");
    expect(striking).toBeDefined();
    expect(striking?.priority).toBe("high");
    expect(striking?.current_position).toBe(6);
  });

  it("detects weak competitor content at #1", () => {
    const snapshot = buildSnapshotFromOrganic("test", [
      {
        position: 1,
        title: "Short",
        url: "https://bhaskar.com/a",
        snippet: "tiny",
        domain: "bhaskar.com",
      },
    ]);

    const opps = detectOpportunities("kw-1", snapshot);
    expect(
      opps.some((o) => o.opportunity_type === "weak_competitor_content")
    ).toBe(true);
  });

  it("detects missing FAQ when PAA present", () => {
    const snapshot = buildSnapshotFromOrganic(
      "test",
      [
        {
          position: 5,
          title: "Jandarpan",
          url: "https://jandarpan.news/a",
          snippet: "story",
          domain: "jandarpan.news",
        },
      ],
      {
        people_also_ask: true,
        paa_questions: ["Q1?", "Q2?"],
      }
    );

    const opps = detectOpportunities("kw-1", snapshot, {
      slug: "a",
      url: "https://jandarpan.news/a",
      headline: "H",
      word_count: 300,
      has_faq: false,
      has_schema: true,
      internal_link_count: 3,
    });

    expect(opps.some((o) => o.opportunity_type === "missing_faq")).toBe(true);
  });
});
