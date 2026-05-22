/**
 * Client-safe display image resolution — always returns a valid URL
 */

import {
  getCategoryFallback,
  getSourceFallback,
  NEWSROOM_PLACEHOLDER,
} from "@/lib/news/images/fallbacks";
import { normalizeImageUrl } from "@/lib/news/images/extract";
import { isDisplayableImage } from "@/lib/news/images/validate";

export type DisplayImageInput = {
  imageUrl: string | null | undefined;
  category: string;
  source?: string | null;
  articleUrl?: string;
};

/**
 * Fallback hierarchy:
 * 1. Valid article image
 * 2. Source-themed fallback
 * 3. Category fallback
 * 4. Premium newsroom placeholder
 */
export function resolveDisplayImage(input: DisplayImageInput): string {
  if (input.imageUrl && isDisplayableImage(input.imageUrl)) {
    return normalizeImageUrl(input.imageUrl, input.articleUrl);
  }

  const source = getSourceFallback(input.source);
  if (source) return source;

  return getCategoryFallback(input.category) ?? NEWSROOM_PLACEHOLDER;
}

/** Optimize Unsplash / CDN URLs for Next/Image card sizes */
export function optimizeImageUrlForNext(
  url: string,
  width = 640
): string {
  if (!url.includes("images.unsplash.com")) return url;

  try {
    const u = new URL(url);
    u.searchParams.set("auto", "format");
    u.searchParams.set("fit", "crop");
    u.searchParams.set("w", String(width));
    u.searchParams.set("q", "80");
    return u.toString();
  } catch {
    return url;
  }
}

export function resolveCardImage(input: DisplayImageInput, width = 640): string {
  return optimizeImageUrlForNext(resolveDisplayImage(input), width);
}
