/**
 * Canonical image resolver — single entry for display / OG / mobile URLs.
 * Preserves existing contextual fallbacks; does not remove them.
 */

import {
  resolveContextualFallback,
  type FallbackTier,
} from "@/lib/news/images/editorial-visual-fallbacks";
import { optimizeCdnImageUrl } from "@/lib/news/images/responsive-sizes";
import { validateImageUrlShape } from "@/lib/news/images/image-url-validation";

export type ImageSourceType =
  | "hero"
  | "og"
  | "body"
  | "contextual_fallback"
  | "branded_placeholder";

export type ImageFallbackState = "none" | "contextual" | "branded";

export type ImageValidationState = "unchecked" | "shape_ok" | "shape_invalid";

export type CanonicalImageResult = {
  displayUrl: string;
  ogUrl: string;
  mobileUrl: string;
  sourceType: ImageSourceType;
  alt: string;
  fallbackState: ImageFallbackState;
  validationState: ImageValidationState;
  fallbackTier?: FallbackTier;
};

export type CanonicalImageInput = {
  heroUrl?: string | null;
  ogUrl?: string | null;
  bodyImageUrl?: string | null;
  title?: string | null;
  category?: string | null;
  region?: string | null;
  source?: string | null;
  alt?: string | null;
};

function pickPrimary(input: CanonicalImageInput): {
  url: string | null;
  sourceType: ImageSourceType;
} {
  const candidates: Array<{ url: string | null | undefined; sourceType: ImageSourceType }> = [
    { url: input.heroUrl, sourceType: "hero" },
    { url: input.ogUrl, sourceType: "og" },
    { url: input.bodyImageUrl, sourceType: "body" },
  ];
  for (const c of candidates) {
    if (c.url && validateImageUrlShape(c.url).ok) {
      return { url: c.url, sourceType: c.sourceType };
    }
  }
  return { url: null, sourceType: "contextual_fallback" };
}

export function resolveCanonicalImage(
  input: CanonicalImageInput
): CanonicalImageResult {
  const alt =
    input.alt?.trim() ||
    (input.title ? String(input.title).slice(0, 120) : "Jan Darpan news image");

  const primary = pickPrimary(input);

  if (primary.url) {
    const displayUrl = optimizeCdnImageUrl(primary.url, 1200);
    const ogUrl = optimizeCdnImageUrl(primary.url, 1200);
    const mobileUrl = optimizeCdnImageUrl(primary.url, 640);
    return {
      displayUrl,
      ogUrl,
      mobileUrl,
      sourceType: primary.sourceType,
      alt,
      fallbackState: "none",
      validationState: "shape_ok",
    };
  }

  const fallback = resolveContextualFallback({
    category: input.category ?? "general",
    region: input.region,
    source: input.source,
  });

  return {
    displayUrl: fallback.url,
    ogUrl: fallback.url,
    mobileUrl: optimizeCdnImageUrl(fallback.url, 640),
    sourceType: "contextual_fallback",
    alt,
    fallbackState: "contextual",
    validationState: "unchecked",
    fallbackTier: fallback.tier,
  };
}
