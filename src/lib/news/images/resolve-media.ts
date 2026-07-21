/**
 * Resolve display URLs with tiered fallbacks — generated_articles compatible.
 * Delegates rejection / brand rules to validate + editorial-image-resolver.
 */

import {
  getCategoryFallback,
  NEWSROOM_PLACEHOLDER,
  resolveFallbackImage,
} from "@/lib/news/images/fallbacks";
import { optimizeCdnUrl } from "@/lib/news/images/cdn";
import { normalizeImageUrl } from "@/lib/news/images/extract";
import { isDisplayableImage, isRejectedImageUrl } from "@/lib/news/images/validate";
import type { MediaAspect } from "@/lib/news/images/aspects";

export type ResolveMediaInput = {
  imageUrl: string | null | undefined;
  category: string;
  source?: string | null;
  region?: string | null;
  articleUrl?: string;
};

export type ResolvedMedia = {
  /** Primary URL (article or contextual fallback); empty string when text-only */
  url: string;
  /** URL after CDN optimization */
  optimizedUrl: string;
  /** Tier-2 fallback if primary fails to load */
  fallbackUrl: string;
  /** Final curated placeholder (never brand logo) */
  placeholderUrl: string;
  isSynthetic: boolean;
  /** When true, UI should render text-only frame (no img) */
  textOnly: boolean;
};

function rawArticleUrl(input: ResolveMediaInput): string | null {
  if (!input.imageUrl?.trim()) return null;
  if (!isDisplayableImage(input.imageUrl)) return null;
  const normalized = normalizeImageUrl(input.imageUrl, input.articleUrl);
  if (!normalized || !isDisplayableImage(normalized)) return null;
  return normalized;
}

function safeCurated(url: string): string | null {
  if (!url?.trim()) return null;
  if (isRejectedImageUrl(url).rejected) return null;
  return url;
}

/**
 * Resolve image chain without failing — always returns usable URLs or textOnly.
 */
export function resolveMedia(input: ResolveMediaInput, aspect: MediaAspect = "16:9"): ResolvedMedia {
  const article = rawArticleUrl(input);
  const contextualRaw = resolveFallbackImage({
    category: input.category,
    source: input.source,
    region: input.region,
  });
  const categoryRaw = getCategoryFallback(input.category);
  const contextual = safeCurated(contextualRaw);
  const categoryOnly = safeCurated(categoryRaw);
  const branded = safeCurated(NEWSROOM_PLACEHOLDER);

  const primary = article ?? contextual ?? categoryOnly ?? branded ?? "";
  const isSynthetic = !article;
  const textOnly = !primary;

  const fallbackUrl = article
    ? contextual ?? categoryOnly ?? branded ?? ""
    : contextual && categoryOnly && contextual !== categoryOnly
      ? categoryOnly
      : branded ?? "";

  const optimize = (url: string) => {
    if (!url) return "";
    return optimizeCdnUrl(url, {
      aspect: aspect === "fill" ? "16:9" : aspect,
      width:
        aspect === "4:5"
          ? 640
          : aspect === "4:3"
            ? 720
            : aspect === "1:1"
              ? 560
              : 720,
    });
  };

  return {
    url: primary,
    optimizedUrl: optimize(primary),
    fallbackUrl: optimize(fallbackUrl),
    placeholderUrl: optimize(branded ?? ""),
    isSynthetic,
    textOnly,
  };
}

/** Back-compat for server components that need a single URL */
export function resolveCardImage(
  input: ResolveMediaInput,
  width = 640,
  aspect: MediaAspect = "16:9"
): string {
  const media = resolveMedia(input, aspect);
  if (media.textOnly || !media.url) return "";
  return optimizeCdnUrl(media.url, { width, aspect });
}

export function resolveDisplayImage(input: ResolveMediaInput): string {
  return resolveMedia(input).url;
}
