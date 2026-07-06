import { describe, expect, it } from "vitest";
import {
  getEditorialImageMeta,
  hasAiEditorialHero,
  isTerminalEditorialImageSource,
} from "@/lib/news/ai/editorial-image-terminal";

describe("isTerminalEditorialImageSource", () => {
  it("accepts AI and curated terminal sources", () => {
    expect(isTerminalEditorialImageSource("ai_generated")).toBe(true);
    expect(isTerminalEditorialImageSource("duplicate_reuse")).toBe(true);
    expect(isTerminalEditorialImageSource("region_curated")).toBe(true);
    expect(isTerminalEditorialImageSource("category_curated")).toBe(true);
    expect(isTerminalEditorialImageSource("repaired")).toBe(true);
  });

  it("rejects publish-time and wire sources", () => {
    expect(isTerminalEditorialImageSource("source_extracted")).toBe(false);
    expect(isTerminalEditorialImageSource("category_fallback")).toBe(false);
    expect(isTerminalEditorialImageSource(undefined)).toBe(false);
  });
});

describe("hasAiEditorialHero", () => {
  it("detects storage AI URLs", () => {
    expect(
      hasAiEditorialHero({
        hero_image_url:
          "https://example.supabase.co/storage/v1/object/public/editorial-images/x.png",
        editorial_metadata: { image: { source: "category_fallback" } },
      })
    ).toBe(true);
  });

  it("detects metadata AI source", () => {
    expect(
      hasAiEditorialHero({
        hero_image_url: "https://images.unsplash.com/photo-1",
        editorial_metadata: { image: { source: "ai_generated" } },
      })
    ).toBe(true);
  });
});

describe("getEditorialImageMeta", () => {
  it("returns empty object when metadata missing", () => {
    expect(getEditorialImageMeta(null)).toEqual({});
  });
});
