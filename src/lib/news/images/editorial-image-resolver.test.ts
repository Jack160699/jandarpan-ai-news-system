import { describe, expect, it } from "vitest";
import {
  nextEditorialImageOnError,
  resolveEditorialImage,
} from "@/lib/news/images/editorial-image-resolver";
import { isRejectedImageUrl } from "@/lib/news/images/validate";
import {
  isExpiredSignedUrl,
  isTrustedImageHost,
  isTrustedImageUrl,
} from "@/lib/news/images/trusted-remote-hosts";
import { validateImageProxyTarget } from "@/lib/news/images/image-proxy-validation";
import { optimizeCdnUrl } from "@/lib/news/images/cdn";
import { resolveMedia } from "@/lib/news/images/resolve-media";
import { resolveCanonicalImage } from "@/lib/news/images/canonical-image-resolver";
import { EDITORIAL_IMAGES } from "@/lib/editorial-images";

describe("editorial-image-resolver", () => {
  it("accepts a valid https editorial image", () => {
    const result = resolveEditorialImage({
      heroUrl: "https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800",
      category: "local",
      title: "Raipur update",
    });
    expect(result.textOnly).toBe(false);
    expect(result.url).toContain("https://");
    expect(result.tier).toBe("generated_editorial");
  });

  it("rejects invalid / malformed URLs and falls back", () => {
    const bad = resolveEditorialImage({
      heroUrl: "not-a-url",
      category: "politics",
    });
    expect(bad.tier === "category_fallback" || bad.tier === "text_only").toBe(
      true
    );
    expect(isRejectedImageUrl("not-a-url").rejected).toBe(true);
  });

  it("rejects http (non-https) URLs", () => {
    const result = resolveEditorialImage({
      heroUrl: "http://cdn.example.com/a.jpg",
      category: "local",
    });
    expect(result.tier).not.toBe("generated_editorial");
    expect(result.tier).not.toBe("story_editorial");
  });

  it("rejects unsupported host for source image tier", () => {
    expect(isTrustedImageHost("evil.example.com")).toBe(false);
    const result = resolveEditorialImage({
      sourceImageUrl: "https://evil.example.com/photo.jpg",
      category: "local",
    });
    // Source tier requires trusted host; should not pick source_image
    expect(result.tier).not.toBe("source_image");
  });

  it("rejects expired signed URLs", () => {
    // JWT with exp=1 (1970)
    const payload = Buffer.from(
      JSON.stringify({ exp: 1, role: "anon" })
    ).toString("base64url");
    const token = `eyJhbGciOiJub25lIn0.${payload}.x`;
    const url = `https://abc.supabase.co/storage/v1/object/sign/editorial-images/a.jpg?token=${token}`;
    expect(isExpiredSignedUrl(url)).toBe(true);
    expect(isRejectedImageUrl(url).reason).toBe("expired_signed_url");

    const result = resolveEditorialImage({
      heroUrl: url,
      category: "local",
    });
    expect(result.tier).not.toBe("generated_editorial");
  });

  it("advances to category then text-only on runtime load failure", () => {
    const primary = resolveEditorialImage({
      heroUrl: "https://images.unsplash.com/photo-1504711434969-e33886168f5c",
      category: "local",
    });
    expect(primary.textOnly).toBe(false);
    const afterFirst = nextEditorialImageOnError(primary);
    // May land on category fallback or text-only depending on fallbackUrl
    const afterSecond = nextEditorialImageOnError(afterFirst);
    expect(afterSecond.textOnly).toBe(true);
    expect(afterSecond.url).toBeNull();
  });

  it("uses category fallback when no hero", () => {
    const result = resolveEditorialImage({
      category: "sports",
      region: "chhattisgarh",
    });
    expect(["category_fallback", "text_only"]).toContain(result.tier);
    if (result.tier === "category_fallback") {
      expect(result.isSynthetic).toBe(true);
      expect(result.url).toBeTruthy();
    }
  });

  it("supports text-only when curated fallbacks are rejected", () => {
    // Force path: no hero + we still get category fallback from Unsplash typically.
    // Explicit text-only via nextEditorialImageOnError double-advance.
    const empty = resolveEditorialImage({ category: "general" });
    const textOnly = nextEditorialImageOnError(
      nextEditorialImageOnError({
        ...empty,
        fallbackUrl: null,
      })
    );
    expect(textOnly.textOnly).toBe(true);
    expect(textOnly.tier).toBe("text_only");
  });

  it("rejects brand / logo / favicon assets", () => {
    expect(
      isRejectedImageUrl(
        "https://www.jandarpan.news/brand/jan-darpan-chhattisgarh-og.png"
      ).reason
    ).toBe("brand_asset");
    expect(
      isRejectedImageUrl("https://cdn.example.com/favicon.ico").reason
    ).toBe("logo_or_icon");
    expect(
      isRejectedImageUrl("https://cdn.example.com/assets/logo.png").reason
    ).toBe("logo_or_icon");
  });

  it("rejects checkerboard / transparency preview URLs when detectable", () => {
    expect(
      isRejectedImageUrl(
        "https://cdn.example.com/exports/checkerboard-preview.png"
      ).reason
    ).toBe("brand_asset");
    expect(
      isRejectedImageUrl(
        "https://cdn.example.com/transparency-preview.png"
      ).reason
    ).toBe("brand_asset");
  });

  it("does not use brand OG as raipurCity fallback stock", () => {
    expect(EDITORIAL_IMAGES.raipurCity).not.toMatch(/\/brand\//);
    expect(isRejectedImageUrl(EDITORIAL_IMAGES.raipurCity).rejected).toBe(
      false
    );
  });

  it("canonical resolver rejects brand hero and falls back", () => {
    const result = resolveCanonicalImage({
      heroUrl:
        "https://www.jandarpan.news/brand/jan-darpan-chhattisgarh-logo.png",
      category: "local",
      region: "raipur",
    });
    expect(result.sourceType).not.toBe("hero");
    expect(result.textOnly === true || result.sourceType === "contextual_fallback").toBe(
      true
    );
  });

  it("resolveMedia never returns brand asset as primary", () => {
    const media = resolveMedia({
      imageUrl:
        "https://www.jandarpan.news/brand/jan-darpan-chhattisgarh-og.png",
      category: "local",
    });
    expect(media.url).not.toMatch(/\/brand\//);
  });

  it("keeps stable aspect via reserved optimize widths", () => {
    const media = resolveMedia(
      {
        imageUrl: "https://images.unsplash.com/photo-1504711434969-e33886168f5c",
        category: "local",
      },
      "4:3"
    );
    expect(media.optimizedUrl.length).toBeGreaterThan(0);
    expect(media.textOnly).toBe(false);
  });

  it("does not invent infinite retry URLs — error helper is finite", () => {
    let cur = resolveEditorialImage({
      heroUrl: "https://images.unsplash.com/photo-1504711434969-e33886168f5c",
      category: "local",
    });
    for (let i = 0; i < 5; i++) {
      cur = nextEditorialImageOnError(cur);
    }
    expect(cur.textOnly).toBe(true);
    expect(cur.url).toBeNull();
  });

  it("safe image proxy validation blocks private and untrusted hosts", () => {
    expect(validateImageProxyTarget("https://127.0.0.1/a.jpg").ok).toBe(false);
    expect(
      validateImageProxyTarget("https://evil.example.com/a.jpg").ok
    ).toBe(false);
    expect(
      validateImageProxyTarget(
        "https://images.unsplash.com/photo-1504711434969-e33886168f5c"
      ).ok
    ).toBe(true);
  });

  it("mobile-oriented CDN optimize shrinks unsplash widths", () => {
    const mobile = optimizeCdnUrl(
      "https://images.unsplash.com/photo-1504711434969-e33886168f5c",
      { width: 200, aspect: "4:3" }
    );
    expect(mobile).toContain("w=200");
    expect(isTrustedImageUrl(mobile)).toBe(true);
  });

  it("does not append speculative query params to signed or unknown hosts", () => {
    const signed =
      "https://abc.supabase.co/storage/v1/object/sign/bucket/a.jpg?token=abc.def.ghi";
    expect(optimizeCdnUrl(signed, { width: 400 })).toBe(signed);

    const unknown = "https://static.example.org/photos/a.jpg";
    expect(optimizeCdnUrl(unknown, { width: 400 })).toBe(unknown);
  });

  it("uses neutral alt for synthetic / text-only frames", () => {
    const textOnly = nextEditorialImageOnError(
      nextEditorialImageOnError(
        resolveEditorialImage({
          heroUrl: "https://images.unsplash.com/photo-1504711434969-e33886168f5c",
          title: "Misleading headline as photo alt",
          category: "local",
        })
      )
    );
    expect(textOnly.alt).not.toContain("Misleading headline");
    expect(textOnly.alt.toLowerCase()).toContain("placeholder");
  });
});
