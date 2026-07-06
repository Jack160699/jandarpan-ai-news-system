import { describe, expect, it } from "vitest";
import {
  assembleEditorialBody,
  isDuplicateOfSummary,
  stripDuplicateSummaryFromBody,
} from "@/lib/news/ai/editorial-body";

describe("editorial-body", () => {
  it("detects duplicate summary in lead", () => {
    const summary =
      "रायपुर में भारी बारिश से जलभराव की स्थिति बनी हुई है और कई इलाकों में यातायात प्रभावित है।";
    expect(isDuplicateOfSummary(summary, summary)).toBe(true);
    expect(
      isDuplicateOfSummary(
        `${summary} पुलिस के अनुसार अधिकारियों ने निगरानी बढ़ाई है।`,
        summary
      )
    ).toBe(true);
  });

  it("assembles natural body without template headings", () => {
    const body = assembleEditorialBody(
      {
        lead: "पुलिस के अनुसार घटना रात करीब 10 बजे हुई।",
        details: "मामले की जांच जारी है।",
      },
      "संक्षिप्त सारांश जो अलग है।"
    );
    expect(body).not.toMatch(/^##\s/m);
    expect(body).toContain("पुलिस के अनुसार");
    expect(body).toContain("मामले की जांच");
  });

  it("omits lead when it repeats summary", () => {
    const summary = "Test summary paragraph for the story.";
    const body = assembleEditorialBody(
      {
        lead: summary,
        details: "Additional reporting details here.",
      },
      summary
    );
    expect(body).not.toContain(summary);
    expect(body).toContain("Additional reporting");
  });

  it("strips duplicate summary paragraph from body", () => {
    const summary = "Same dek text.";
    const body = `Same dek text.\n\nUnique reporting paragraph.`;
    expect(stripDuplicateSummaryFromBody(body, summary)).toBe(
      "Unique reporting paragraph."
    );
  });
});
