import { describe, expect, it } from "vitest";
import { buildEditorialIntelligenceInspector } from "./editorial-intelligence-inspector";

describe("buildEditorialIntelligenceInspector", () => {
  it("never throws and returns the inspector VM contract", () => {
    const base = {
      id: "bad",
      slug: "bad",
      headline: "Test",
      summary: null,
      article_body: "",
      hero_image_url: null,
      seo_title: null,
      seo_description: null,
      language: "hi",
      tags: [] as string[],
      published_at: null,
      editorial_status: null,
      editorial_metadata: null,
      translations: null,
      created_at: "2026-07-19T00:00:00.000Z",
      event_id: null,
      workflow_status: null,
    };

    expect(() => buildEditorialIntelligenceInspector(base)).not.toThrow();

    const vm = buildEditorialIntelligenceInspector(base);

    expect(vm).toHaveProperty("hasContent");
    expect(vm).toHaveProperty("editorial");
    expect(vm).toHaveProperty("trust");
    expect(vm).toHaveProperty("knowledge");
    expect(vm).toHaveProperty("navigation");
  });
});
