import { describe, expect, it } from "vitest";

import { isEditoriallyEligibleSourceImageUrl } from "@/lib/news/ai/generate-editorial-image";

describe("editorial source image eligibility", () => {
  it("rejects generic stock URLs carried by feeds", () => {
    expect(
      isEditoriallyEligibleSourceImageUrl(
        "https://images.unsplash.com/photo-1449824913935-59a10b8d2000"
      )
    ).toBe(false);
  });

  it("allows a displayable publisher image for worker validation", () => {
    expect(
      isEditoriallyEligibleSourceImageUrl(
        "https://static.example.com/news/raipur-civic-service.jpg"
      )
    ).toBe(true);
  });
});
