import { describe, expect, it } from "vitest";
import { validateClaimsAgainstFactPack } from "@/lib/news/ai/generated-article-validation";
import type { FactPack } from "@/lib/news/ai/fact-pack";

function baseFactPack(overrides: Partial<FactPack> = {}): FactPack {
  return {
    eventId: "evt-1",
    sources: [
      {
        name: "Local Desk",
        url: "https://example.com/story-1",
        publishedAt: new Date().toISOString(),
        headline: "Test source headline",
      },
    ],
    people: ["Amit Sharma"],
    organizations: [],
    district: "Raipur",
    location: "Raipur",
    dates: [],
    numbers: [],
    quotes: [],
    conflictingClaims: [],
    primarySourceIndicator: false,
    sourceReliability: 0.5,
    sensitiveCategory: null,
    freshnessHours: 2,
    chhattisgarhRelevance: 0.8,
    supportingExcerpts: [],
    builtAt: new Date().toISOString(),
    ...overrides,
  };
}

const HEADLINE = "Local administration announces district development plan";
const SUMMARY = "Officials outlined a district-level development plan for the region.";

describe("validateClaimsAgainstFactPack - names", () => {
  it("flags a name-shaped mention with no match in factPack.people as unsupported_name (retryable)", () => {
    const issues = validateClaimsAgainstFactPack({
      headline: HEADLINE,
      summary: SUMMARY,
      articleBody:
        "Officials confirmed the plan during a briefing. Rajesh Malhotra visited the site yesterday to inspect ongoing works.",
      factPack: baseFactPack({ people: ["Amit Sharma"] }),
    });

    const nameIssue = issues.find((i) => i.code === "unsupported_name");
    expect(nameIssue).toBeDefined();
    expect(nameIssue?.retryable).toBe(true);
  });

  it("does not flag a name that fuzzily/substring-matches a factPack.people entry", () => {
    const issues = validateClaimsAgainstFactPack({
      headline: HEADLINE,
      summary: SUMMARY,
      articleBody:
        "Ramesh Kumar Verma inaugurated the new health centre in the district today.",
      // factPack entry is a substring of the draft mention ("...verma".includes("kumar verma"))
      // proving the permissive substring/word-overlap matcher actually suppresses the flag.
      factPack: baseFactPack({ people: ["Kumar Verma"] }),
    });

    expect(issues.map((i) => i.code)).not.toContain("unsupported_name");
  });
});

describe("validateClaimsAgainstFactPack - relative dates", () => {
  it("never flags relative date tokens (today/yesterday/tomorrow/आज/कल) even with an empty factPack.dates", () => {
    const issues = validateClaimsAgainstFactPack({
      headline: HEADLINE,
      summary: SUMMARY,
      articleBody:
        "अधिकारियों ने आज घोषणा की। अगली बैठक कल आयोजित होगी। Officials said the announcement happened today, and a follow-up review is scheduled for tomorrow.",
      factPack: baseFactPack({ dates: [] }),
    });

    expect(issues.map((i) => i.code)).not.toContain("unsupported_date");
  });
});

describe("validateClaimsAgainstFactPack - numbers", () => {
  it("flags a large/currency-marked number not present in factPack.numbers", () => {
    const issues = validateClaimsAgainstFactPack({
      headline: HEADLINE,
      summary: SUMMARY,
      articleBody:
        "The state government sanctioned ₹450 crore for the project across the district.",
      factPack: baseFactPack({ numbers: ["100"] }),
    });

    expect(issues.map((i) => i.code)).toContain("unsupported_number");
  });

  it("does not flag a small number like an age or list position (noise-filtered)", () => {
    const issues = validateClaimsAgainstFactPack({
      headline: HEADLINE,
      summary: SUMMARY,
      articleBody:
        "The victim, aged 45, was the third person named in the report published by officials.",
      factPack: baseFactPack({ numbers: [] }),
    });

    expect(issues.map((i) => i.code)).not.toContain("unsupported_number");
  });
});

describe("validateClaimsAgainstFactPack - quotes", () => {
  it("flags a quoted string with no match in factPack.quotes", () => {
    const issues = validateClaimsAgainstFactPack({
      headline: HEADLINE,
      summary: SUMMARY,
      articleBody:
        'The minister said "the new hospital will open within six months" during the visit.',
      factPack: baseFactPack({ quotes: [] }),
    });

    expect(issues.map((i) => i.code)).toContain("unsupported_quote");
  });
});

describe("validateClaimsAgainstFactPack - insufficient_sensitive_sourcing", () => {
  it("hard-blocks (retryable:false) when sensitiveCategory is set, <2 sources, and primarySourceIndicator is false", () => {
    const issues = validateClaimsAgainstFactPack({
      headline: HEADLINE,
      summary: SUMMARY,
      articleBody: "Police registered a case after the incident was reported near the market.",
      factPack: baseFactPack({
        sensitiveCategory: "crime",
        sources: [
          {
            name: "Local Desk",
            url: "https://example.com/story-1",
            publishedAt: null,
            headline: "Incident reported",
          },
        ],
        primarySourceIndicator: false,
      }),
    });

    const sourcingIssue = issues.find((i) => i.code === "insufficient_sensitive_sourcing");
    expect(sourcingIssue).toBeDefined();
    // Safety-critical: this must be a hard, non-retryable block.
    expect(sourcingIssue?.retryable).toBe(false);
  });

  it("does not block when primarySourceIndicator is true, even with a single source", () => {
    const issues = validateClaimsAgainstFactPack({
      headline: HEADLINE,
      summary: SUMMARY,
      articleBody: "Police registered a case after the incident was reported near the market.",
      factPack: baseFactPack({
        sensitiveCategory: "crime",
        sources: [
          {
            name: "Local Desk",
            url: "https://example.com/story-1",
            publishedAt: null,
            headline: "Incident reported",
          },
        ],
        primarySourceIndicator: true,
      }),
    });

    expect(issues.map((i) => i.code)).not.toContain("insufficient_sensitive_sourcing");
  });

  it("does not block when 2+ sources are present", () => {
    const issues = validateClaimsAgainstFactPack({
      headline: HEADLINE,
      summary: SUMMARY,
      articleBody: "Police registered a case after the incident was reported near the market.",
      factPack: baseFactPack({
        sensitiveCategory: "crime",
        sources: [
          {
            name: "Local Desk",
            url: "https://example.com/story-1",
            publishedAt: null,
            headline: "Incident reported",
          },
          {
            name: "Regional Desk",
            url: "https://example.com/story-2",
            publishedAt: null,
            headline: "Incident reported, follow-up",
          },
        ],
        primarySourceIndicator: false,
      }),
    });

    expect(issues.map((i) => i.code)).not.toContain("insufficient_sensitive_sourcing");
  });
});
