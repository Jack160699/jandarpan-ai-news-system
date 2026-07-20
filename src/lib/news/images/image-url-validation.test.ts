import { describe, expect, it } from "vitest";
import {
  looksLikeImagePath,
  validateImageUrlShape,
  validatePublicImageUrl,
} from "@/lib/news/images/image-url-validation";

describe("image-url-validation", () => {
  it("rejects http", () => {
    expect(validateImageUrlShape("http://cdn.example.com/a.jpg").ok).toBe(
      false
    );
    expect(validateImageUrlShape("http://cdn.example.com/a.jpg").reason).toBe(
      "https_required"
    );
  });

  it("accepts https shape", () => {
    expect(
      validateImageUrlShape("https://cdn.example.com/photos/hero.jpg").ok
    ).toBe(true);
  });

  it("rejects html paths", () => {
    expect(
      validateImageUrlShape("https://example.com/story.html").ok
    ).toBe(false);
  });

  it("looksLikeImagePath detects extensions", () => {
    expect(looksLikeImagePath("https://x.com/a.webp")).toBe(true);
    expect(looksLikeImagePath("https://x.com/a")).toBe(false);
  });

  it("validatePublicImageUrl uses injectable fetch (no network)", async () => {
    const fakeFetch: typeof fetch = async () =>
      new Response(null, {
        status: 200,
        headers: {
          "content-type": "image/jpeg",
          "content-length": "2048",
        },
      });

    const ok = await validatePublicImageUrl(
      "https://cdn.example.com/a.jpg",
      { fetchImpl: fakeFetch }
    );
    expect(ok.ok).toBe(true);

    const bad = await validatePublicImageUrl("http://cdn.example.com/a.jpg", {
      fetchImpl: fakeFetch,
    });
    expect(bad.ok).toBe(false);
  });
});
