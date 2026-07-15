/**
 * Resolve display URLs with tiered fallbacks — generated_articles compatible
 */

import {
  getCategoryFallback,
  NEWSROOM_PLACEHOLDER,
  resolveFallbackImage,
} from "@/lib/news/images/fallbacks";
import { optimizeCdnUrl } from "@/lib/news/images/cdn";
import { normalizeImageUrl } from "@/lib/news/images/extract";
import { isDisplayableImage } from "@/lib/news/images/validate";
import type { MediaAspect } from "@/lib/news/images/aspects";

export type ResolveMediaInput = {
  imageUrl: string | null | undefined;
  category: string;
  source?: string | null;
  region?: string | null;
  articleUrl?: string;
  headline?: string | null;
  tags?: string[];
};

export type ResolvedMedia = {
  /** Primary URL (article or contextual fallback) */
  url: string;
  /** URL after CDN optimization */
  optimizedUrl: string;
  /** Tier-2 fallback if primary fails to load */
  fallbackUrl: string;
  /** Final branded placeholder */
  placeholderUrl: string;
  isSynthetic: boolean;
};

function rawArticleUrl(input: ResolveMediaInput): string | null {
  if (!input.imageUrl?.trim()) return null;
  if (!isDisplayableImage(input.imageUrl)) return null;
  return normalizeImageUrl(input.imageUrl, input.articleUrl);
}

/**
 * Resolve image chain without failing — always returns valid URLs
 */
export function resolveMedia(input: ResolveMediaInput, aspect: MediaAspect = "16:9"): ResolvedMedia {
  const article = rawArticleUrl(input);
  const contextual = resolveFallbackImage({
    category: input.category,
    source: input.source,
    region: input.region,
    headline: input.headline,
    tags: input.tags,
  });
  const categoryOnly = getCategoryFallback(input.category);
  const branded = NEWSROOM_PLACEHOLDER;

  const primary = article ?? contextual;
  const isSynthetic = !article;

  const fallbackUrl = article
    ? contextual
    : contextual !== categoryOnly
      ? categoryOnly
      : branded;

  const optimize = (url: string) =>
    optimizeCdnUrl(url, {
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

  return {
    url: primary,
    optimizedUrl: optimize(primary),
    fallbackUrl: optimize(fallbackUrl),
    placeholderUrl: optimize(branded),
    isSynthetic,
  };
}

/** Back-compat for server components that need a single URL */
export function resolveCardImage(
  input: ResolveMediaInput,
  width = 640,
  aspect: MediaAspect = "16:9"
): string {
  const media = resolveMedia(input, aspect);
  return optimizeCdnUrl(media.url, { width, aspect });
}

export function resolveDisplayImage(input: ResolveMediaInput): string {
  return resolveMedia(input).url;
}
