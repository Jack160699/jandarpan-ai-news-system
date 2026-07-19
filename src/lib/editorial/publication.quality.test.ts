import { describe, expect, it } from "vitest";
import { validateGeneratedArticle } from "@/lib/news/ai/generated-article-validation";

describe("publication quality gate", () => {
  it("blocks untitled empty drafts from publish validation", () => {
    const r = validateGeneratedArticle({
      headline: "Untitled story",
      summary: "",
      articleBody: "",
      language: "hi",
      category: "world",
      stage: "publish",
      allowDeskDraft: true,
    });
    expect(r.ok).toBe(false);
    expect(r.codes).toEqual(
      expect.arrayContaining(["placeholder_title", "empty_body", "invalid_summary"])
    );
  });

  it("allows a complete story at publish stage", () => {
    const body = `
## Lead
Officials in Raipur outlined a multi-district infrastructure package covering roads and clinics.

## Context
The announcement followed a cabinet briefing. Implementation timelines will be published monthly for each district after funding clearance.
`.trim();
    const r = validateGeneratedArticle({
      headline: "Infrastructure package announced for districts",
      summary: "Cabinet briefing sets timelines for roads and clinics across districts.",
      articleBody: body,
      language: "en",
      category: "politics",
      region: "Raipur",
      sourceAttributions: [
        {
          source: "PIB",
          article_url: "https://example.com/infra",
          signal_id: "s1",
        },
      ],
      generationMetadata: { generated_at: new Date().toISOString() },
      stage: "publish",
    });
    expect(r.ok).toBe(true);
  });
});
