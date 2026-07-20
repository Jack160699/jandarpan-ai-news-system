import { describe, expect, it } from "vitest";
import { resolveCanonicalImage } from "@/lib/news/images/canonical-image-resolver";

describe("canonical-image-resolver", () => {
  it("uses hero when present and https", () => {
    const result = resolveCanonicalImage({
      heroUrl: "https://cdn.example.com/hero.jpg",
      title: "Test story",
      category: "local",
    });
    expect(result.sourceType).toBe("hero");
    expect(result.fallbackState).toBe("none");
    expect(result.displayUrl).toContain("https://");
    expect(result.validationState).toBe("shape_ok");
  });

  it("falls back when no hero/og/body", () => {
    const result = resolveCanonicalImage({
      title: "District update",
      category: "local",
      region: "chhattisgarh",
    });
    expect(result.sourceType).toBe("contextual_fallback");
    expect(result.fallbackState).toBe("contextual");
    expect(result.displayUrl.length).toBeGreaterThan(0);
    expect(result.ogUrl.length).toBeGreaterThan(0);
    expect(result.mobileUrl.length).toBeGreaterThan(0);
  });

  it("rejects http hero and falls back", () => {
    const result = resolveCanonicalImage({
      heroUrl: "http://insecure.example.com/x.jpg",
      category: "politics",
    });
    expect(result.sourceType).toBe("contextual_fallback");
  });
});
