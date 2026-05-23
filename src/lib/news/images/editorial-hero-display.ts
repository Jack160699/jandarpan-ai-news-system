/**
 * Client-safe hero image display — responsive sizes, graceful fallback chain
 */

import { buildResponsiveSizes } from "@/lib/news/images/responsive-sizes";
import { resolveContextualFallback } from "@/lib/news/images/editorial-visual-fallbacks";
import { resolveDisplayImage } from "@/lib/news/images/display";
import type { EditorialImageMeta } from "@/lib/types/newsroom";

export type EditorialHeroDisplay = {
  src: string;
  fallbackSrc: string;
  sizes: string;
  ogUrl?: string | null;
  imageMeta?: EditorialImageMeta | null;
};

export function buildEditorialHeroDisplay(input: {
  heroUrl: string | null | undefined;
  category: string;
  region?: string | null;
  source?: string | null;
  imageMeta?: EditorialImageMeta | null;
}): EditorialHeroDisplay {
  const contextual = resolveContextualFallback({
    category: input.category,
    region: input.region,
    source: input.source,
  });

  const src = resolveDisplayImage({
    imageUrl: input.heroUrl ?? input.imageMeta?.hero_url,
    category: input.category,
    source: input.source,
  });

  return {
    src,
    fallbackSrc: contextual.url,
    sizes: input.imageMeta?.responsive_sizes ?? buildResponsiveSizes(),
    ogUrl: input.imageMeta?.og_url ?? null,
    imageMeta: input.imageMeta,
  };
}
