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

describe("third-party-branding-hard-ban", () => {
  it("strictly rejects Amar Ujala URLs and assets", async () => {
    const { hasVerifiedRealMedia } = await import("@/lib/news/images/validate");
    expect(hasVerifiedRealMedia("https://img.amarujala.com/upload/2026/09/photo.jpg")).toBe(false);
    expect(hasVerifiedRealMedia("https://www.amarujala.com/assets/breaking.jpg")).toBe(false);
    expect(hasVerifiedRealMedia("https://cdn.example.com/amarujala-photo.webp")).toBe(false);
  });

  it("strictly rejects competing TV channel bugs, lower thirds, anchors and watermarks", async () => {
    const { hasVerifiedRealMedia } = await import("@/lib/news/images/validate");
    expect(hasVerifiedRealMedia("https://ibc24.in/images/breaking-news.jpg")).toBe(false);
    expect(hasVerifiedRealMedia("https://cdn.example.com/cg-news/channel-bug.jpg")).toBe(false);
    expect(hasVerifiedRealMedia("https://cdn.example.com/cg-news/lower-third.png")).toBe(false);
    expect(hasVerifiedRealMedia("https://cdn.example.com/tv-anchor-speaking.jpg")).toBe(false);
    expect(hasVerifiedRealMedia("https://cdn.example.com/watermark-preview.jpg")).toBe(false);
    expect(hasVerifiedRealMedia("https://cdn.example.com/studio-screen-broadcast.jpg")).toBe(false);
  });

  it("permits authentic unbranded news photographs", async () => {
    const { hasVerifiedRealMedia } = await import("@/lib/news/images/validate");
    expect(hasVerifiedRealMedia("https://images.livemint.com/img/2026/09/raipur-ground-report.jpg?w=800&h=600")).toBe(true);
    expect(hasVerifiedRealMedia("https://images.thehindu.com/news/national/chhattisgarh-assembly-building.jpg?w=800&h=600")).toBe(true);
  });
});

