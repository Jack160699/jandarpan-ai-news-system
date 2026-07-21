/**
 * Canonical image resolver — single entry for display / OG / mobile URLs.
 * Uses editorial rejection rules; never returns brand/logo assets.
 */

import {
  resolveContextualFallback,
  type FallbackTier,
} from "@/lib/news/images/editorial-visual-fallbacks";
import { optimizeCdnImageUrl } from "@/lib/news/images/responsive-sizes";
import { validateImageUrlShape } from "@/lib/news/images/image-url-validation";
import { isRejectedImageUrl } from "@/lib/news/images/validate";
import { isExpiredSignedUrl } from "@/lib/news/images/trusted-remote-hosts";

export type ImageSourceType =
  | "hero"
  | "og"
  | "body"
  | "contextual_fallback"
  | "branded_placeholder"
  | "text_only";

export type ImageFallbackState = "none" | "contextual" | "branded" | "text_only";

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
  /** When true, UI should render text-only (no img element). */
  textOnly?: boolean;
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

function isAcceptableUrl(url: string | null | undefined): boolean {
  if (!url?.trim()) return false;
  if (!validateImageUrlShape(url).ok) return false;
  if (isExpiredSignedUrl(url)) return false;
  if (isRejectedImageUrl(url).rejected) return false;
  return true;
}

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
    if (c.url && isAcceptableUrl(c.url)) {
      return { url: c.url, sourceType: c.sourceType };
    }
  }
  return { url: null, sourceType: "contextual_fallback" };
}

function safeAlt(input: CanonicalImageInput, textOnly: boolean): string {
  if (input.alt?.trim()) return input.alt.trim().slice(0, 120);
  if (textOnly) return "Editorial visual placeholder";
  if (input.title) return `Illustration related to: ${String(input.title).slice(0, 100)}`;
  return "Jan Darpan news image";
}

export function resolveCanonicalImage(
  input: CanonicalImageInput
): CanonicalImageResult {
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
      alt: safeAlt(input, false),
      fallbackState: "none",
      validationState: "shape_ok",
      textOnly: false,
    };
  }

  const fallback = resolveContextualFallback({
    category: input.category ?? "general",
    region: input.region,
    source: input.source,
  });

  if (isAcceptableUrl(fallback.url)) {
    return {
      displayUrl: fallback.url,
      ogUrl: fallback.url,
      mobileUrl: optimizeCdnImageUrl(fallback.url, 640),
      sourceType: "contextual_fallback",
      alt: safeAlt(input, false),
      fallbackState: "contextual",
      validationState: "unchecked",
      fallbackTier: fallback.tier,
      textOnly: false,
    };
  }

  // Clean text-only — do not fabricate event imagery or brand marks.
  return {
    displayUrl: "",
    ogUrl: "",
    mobileUrl: "",
    sourceType: "text_only",
    alt: safeAlt(input, true),
    fallbackState: "text_only",
    validationState: "shape_invalid",
    textOnly: true,
  };
}
