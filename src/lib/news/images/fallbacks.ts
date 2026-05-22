/**
 * Fallback hierarchy: article → source → category → newsroom placeholder
 */

import { EDITORIAL_IMAGES } from "@/lib/editorial-images";

const SOURCE_FALLBACKS: Record<string, string> = {
  "dainik bhaskar": EDITORIAL_IMAGES.raipurCity,
  bhaskar: EDITORIAL_IMAGES.raipurCity,
  patrika: EDITORIAL_IMAGES.civicOffice,
  haribhoomi: EDITORIAL_IMAGES.ruralHealth,
  "nai dunia": EDITORIAL_IMAGES.metroStreet,
  naidunia: EDITORIAL_IMAGES.metroStreet,
  jagran: EDITORIAL_IMAGES.pressConference,
  "etv bharat": EDITORIAL_IMAGES.folkCulture,
  zee: EDITORIAL_IMAGES.assemblyPolitics,
  ndtv: EDITORIAL_IMAGES.pressConference,
  pib: EDITORIAL_IMAGES.civicOffice,
  "prabhat khabar": EDITORIAL_IMAGES.steelIndustry,
  gnews: EDITORIAL_IMAGES.newsroomDesk,
  newsdata: EDITORIAL_IMAGES.newsroomDesk,
};

const CATEGORY_FALLBACKS: Record<string, string> = {
  local: EDITORIAL_IMAGES.raipurCity,
  politics: EDITORIAL_IMAGES.assemblyPolitics,
  business: EDITORIAL_IMAGES.steelIndustry,
  technology: EDITORIAL_IMAGES.newsroomDesk,
  sports: EDITORIAL_IMAGES.cricketGround,
  entertainment: EDITORIAL_IMAGES.folkCulture,
  health: EDITORIAL_IMAGES.ruralHealth,
  world: EDITORIAL_IMAGES.metroStreet,
};

export const NEWSROOM_PLACEHOLDER = EDITORIAL_IMAGES.newsroomDesk;

export function getSourceFallback(source: string | null | undefined): string | null {
  if (!source) return null;
  const key = source.toLowerCase();
  for (const [needle, url] of Object.entries(SOURCE_FALLBACKS)) {
    if (key.includes(needle)) return url;
  }
  return null;
}

export function getCategoryFallback(category: string): string {
  return CATEGORY_FALLBACKS[category] ?? NEWSROOM_PLACEHOLDER;
}

export function resolveFallbackImage(input: {
  category: string;
  source?: string | null;
}): string {
  return getSourceFallback(input.source) ?? getCategoryFallback(input.category);
}
