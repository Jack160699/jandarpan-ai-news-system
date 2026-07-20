/**
 * Premium contextual fallback hierarchy — category + region aware.
 * Canonical display/OG/mobile resolution: `canonical-image-resolver.ts`
 * (this module remains the contextual fallback source of truth).
 */

import { EDITORIAL_IMAGES } from "@/lib/editorial-images";
import type { CategoryFallbackKey } from "@/lib/news/ai/editorial-image-brand";
import { getCategoryVisualTemplate } from "@/lib/news/ai/editorial-image-brand";
import { optimizeCdnImageUrl } from "@/lib/news/images/responsive-sizes";

const REGION_FALLBACKS: Record<string, string> = {
  chhattisgarh: EDITORIAL_IMAGES.raipurCity,
  raipur: EDITORIAL_IMAGES.raipurCity,
  bastar: EDITORIAL_IMAGES.folkCulture,
  india: EDITORIAL_IMAGES.civicOffice,
};

const SOURCE_FALLBACKS: Record<string, string> = {
  "dainik bhaskar": EDITORIAL_IMAGES.raipurCity,
  bhaskar: EDITORIAL_IMAGES.raipurCity,
  patrika: EDITORIAL_IMAGES.civicOffice,
  haribhoomi: EDITORIAL_IMAGES.ruralHealth,
  "nai dunia": EDITORIAL_IMAGES.metroStreet,
  naidunia: EDITORIAL_IMAGES.metroStreet,
  jagran: EDITORIAL_IMAGES.pressConference,
  "etv bharat": EDITORIAL_IMAGES.folkCulture,
  pib: EDITORIAL_IMAGES.civicOffice,
  "prabhat khabar": EDITORIAL_IMAGES.steelIndustry,
  gnews: EDITORIAL_IMAGES.newsroomDesk,
  newsdata: EDITORIAL_IMAGES.newsroomDesk,
  rss: EDITORIAL_IMAGES.raipurCity,
};

export type FallbackTier =
  | "ai_generated"
  | "duplicate_reuse"
  | "source_extracted"
  | "category_curated"
  | "region_curated"
  | "branded_placeholder";

export function getBrandedPlaceholder(): string {
  return optimizeCdnImageUrl(EDITORIAL_IMAGES.newsroomDesk, 1200);
}

export function resolveContextualFallback(input: {
  category: string;
  region?: string | null;
  source?: string | null;
}): { url: string; tier: FallbackTier; fallbackKey: string } {
  if (input.source) {
    const key = input.source.toLowerCase();
    for (const [needle, url] of Object.entries(SOURCE_FALLBACKS)) {
      if (key.includes(needle)) {
        return {
          url: optimizeCdnImageUrl(url, 1200),
          tier: "source_extracted",
          fallbackKey: needle,
        };
      }
    }
  }

  if (input.region) {
    const r = input.region.toLowerCase();
    for (const [needle, url] of Object.entries(REGION_FALLBACKS)) {
      if (r.includes(needle)) {
        return {
          url: optimizeCdnImageUrl(url, 1200),
          tier: "region_curated",
          fallbackKey: needle,
        };
      }
    }
  }

  const template = getCategoryVisualTemplate(input.category);
  const url = EDITORIAL_IMAGES[template.fallbackKey as CategoryFallbackKey];
  return {
    url: optimizeCdnImageUrl(url ?? EDITORIAL_IMAGES.newsroomDesk, 1200),
    tier: "category_curated",
    fallbackKey: template.fallbackKey,
  };
}
