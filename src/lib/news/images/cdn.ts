/**
 * CDN / remote image optimization for Next/Image
 * Keeps mobile payloads small while preserving crop quality
 */

import { cdnCropForAspect, type MediaAspect } from "@/lib/news/images/aspects";

const MAX_WIDTH = 1280;
const MIN_WIDTH = 160;

function clampWidth(width: number): number {
  return Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, Math.round(width)));
}

type OptimizeOpts = {
  width?: number;
  aspect?: MediaAspect;
  quality?: number;
};

/**
 * Apply provider-specific resize/crop params
 */
export function optimizeCdnUrl(
  url: string,
  opts: OptimizeOpts = {}
): string {
  if (!url?.trim() || !url.startsWith("http")) return url;

  const aspect = opts.aspect ?? "16:9";
  const crop = cdnCropForAspect(aspect === "fill" ? "16:9" : aspect);
  const w = clampWidth(opts.width ?? crop.w);
  const h = Math.round(w * (crop.h / crop.w));
  const q = opts.quality ?? 75;

  try {
    const lower = url.toLowerCase();

    if (lower.includes("images.unsplash.com")) {
      const u = new URL(url);
      u.searchParams.set("auto", "format");
      u.searchParams.set("fit", "crop");
      u.searchParams.set("crop", "entropy");
      u.searchParams.set("w", String(w));
      u.searchParams.set("h", String(h));
      u.searchParams.set("q", String(q));
      return u.toString();
    }

    if (lower.includes("supabase.co") && lower.includes("/storage/v1/object/public/")) {
      const u = new URL(url);
      if (!u.searchParams.has("width")) {
        u.searchParams.set("width", String(w));
        u.searchParams.set("quality", String(q));
        u.searchParams.set("resize", "cover");
      }
      return u.toString();
    }

    if (
      lower.includes("googleusercontent.com") ||
      lower.includes("ggpht.com") ||
      lower.includes("gnews.io")
    ) {
      const u = new URL(url);
      if (!u.searchParams.has("w") && !u.searchParams.has("width")) {
        u.searchParams.set("w", String(w));
      }
      return u.toString();
    }

    if (lower.includes("ndtvimg.com") || lower.includes("ndtv.in")) {
      const u = new URL(url);
      u.searchParams.set("w", String(w));
      u.searchParams.set("q", String(q));
      return u.toString();
    }

    if (
      lower.includes("wp-content/uploads") ||
      lower.includes("i0.wp.com") ||
      lower.includes("cdn.")
    ) {
      const u = new URL(url);
      if (!u.searchParams.has("w") && !u.searchParams.has("width")) {
        u.searchParams.set("w", String(w));
      }
      return u.toString();
    }

    const u = new URL(url);
    if (!u.searchParams.has("w") && !u.searchParams.has("width")) {
      u.searchParams.set("w", String(w));
    }
    return u.toString();
  } catch {
    return url;
  }
}

/** @deprecated alias */
export function optimizeImageUrlForNext(
  url: string,
  width = 640,
  aspect: MediaAspect = "16:9"
): string {
  return optimizeCdnUrl(url, { width, aspect });
}

export function optimizeCdnImageUrl(url: string, width = 1200): string {
  return optimizeCdnUrl(url, { width, aspect: "16:9" });
}
