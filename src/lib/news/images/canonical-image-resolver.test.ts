import { describe, expect, it } from "vitest";
import { resolveCanonicalImage } from "@/lib/news/images/canonical-image-resolver";

describe("canonical-image-resolver", () => {
  it("uses hero when present and https", () => {
    const result = resolveCanonicalImage({
      heroUrl: "https://images.unsplash.com/photo-1504711434969-e33886168f5c",
      title: "Test story",
      category: "local",
    });
    expect(result.sourceType).toBe("hero");
    expect(result.fallbackState).toBe("none");
    expect(result.displayUrl).toContain("https://");
    expect(result.validationState).toBe("shape_ok");
    expect(result.textOnly).toBe(false);
  });

  it("falls back when no hero/og/body", () => {
    const result = resolveCanonicalImage({
      title: "District update",
      category: "local",
      region: "chhattisgarh",
    });
    expect(["contextual_fallback", "text_only"]).toContain(result.sourceType);
    if (!result.textOnly) {
      expect(result.displayUrl.length).toBeGreaterThan(0);
      expect(result.ogUrl.length).toBeGreaterThan(0);
      expect(result.mobileUrl.length).toBeGreaterThan(0);
    }
  });

  it("rejects http hero and falls back", () => {
    const result = resolveCanonicalImage({
      heroUrl: "http://insecure.example.com/x.jpg",
      category: "politics",
    });
    expect(result.sourceType).not.toBe("hero");
  });

  it("rejects brand assets used as hero", () => {
    const result = resolveCanonicalImage({
      heroUrl: "https://www.jandarpan.news/brand/jan-darpan-mark.png",
      category: "local",
    });
    expect(result.sourceType).not.toBe("hero");
  });

  it("rejects generic NYC street image when story is about agriculture", () => {
    const result = resolveCanonicalImage({
      heroUrl: "https://images.unsplash.com/photo-1449824913935-59a10b8d2000?auto=format&fit=crop&w=1600&q=82",
      title: "बस्तर में किसान ने नारियल की खेती से की लाखों की कमाई",
      category: "local",
    });
    expect(result.sourceType).toBe("contextual_fallback");
    expect(result.displayUrl).not.toContain("photo-1449824913935-59a10b8d2000");
    // Resolves to agriculture visual
    expect(result.displayUrl).toContain("photo-1500937386664-56d1dfef3854");
  });
});
