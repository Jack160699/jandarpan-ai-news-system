import { describe, expect, it } from "vitest";

import { resolveDeskTemplateFromCategory } from "./prompts";

describe("editorial desk urgency scale", () => {
  it("does not treat a 0-100 urgency score of 52 as breaking", () => {
    expect(
      resolveDeskTemplateFromCategory("local", {
        region: "chhattisgarh",
        urgencyScore: 52,
      })
    ).toBe("district_update");
  });

  it("supports both normalized and 0-100 urgency scales", () => {
    expect(resolveDeskTemplateFromCategory("local", { urgencyScore: 0.8 })).toBe(
      "breaking_news"
    );
    expect(resolveDeskTemplateFromCategory("local", { urgencyScore: 80 })).toBe(
      "breaking_news"
    );
  });
});
