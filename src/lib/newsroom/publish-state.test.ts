import { describe, expect, it } from "vitest";
import { isPublicGeneratedArticle } from "@/lib/newsroom/publish-state";

describe("isPublicGeneratedArticle", () => {
  it("excludes archived workflow articles from the public pool", () => {
    expect(
      isPublicGeneratedArticle({
        editorial_status: "approved",
        published_at: "2025-01-01T00:00:00.000Z",
        workflow_status: "archived",
      })
    ).toBe(false);
  });

  it("includes published workflow articles", () => {
    expect(
      isPublicGeneratedArticle({
        editorial_status: "approved",
        published_at: "2025-01-01T00:00:00.000Z",
        workflow_status: "published",
      })
    ).toBe(true);
  });
});
