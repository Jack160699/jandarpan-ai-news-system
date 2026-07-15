/**
 * Fallback hierarchy — delegates to premium contextual visual fallbacks
 */

import {
  getBrandedPlaceholder,
  resolveContextualFallback,
} from "@/lib/news/images/editorial-visual-fallbacks";

export const NEWSROOM_PLACEHOLDER = getBrandedPlaceholder();

export function getSourceFallback(source: string | null | undefined): string | null {
  if (!source) return null;
  const { url, tier } = resolveContextualFallback({
    category: "local",
    source,
  });
  return tier === "source_extracted" ? url : null;
}

export function getCategoryFallback(category: string): string {
  return resolveContextualFallback({ category }).url;
}

export function resolveFallbackImage(input: {
  category: string;
  source?: string | null;
  region?: string | null;
  headline?: string | null;
  tags?: string[];
}): string {
  return resolveContextualFallback(input).url;
}
