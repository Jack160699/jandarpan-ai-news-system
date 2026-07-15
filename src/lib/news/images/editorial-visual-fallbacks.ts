/**
 * Premium contextual fallback hierarchy — category + region aware
 */

import { EDITORIAL_IMAGES } from "@/lib/editorial-images";
import type { CategoryFallbackKey } from "@/lib/news/ai/editorial-image-brand";
import { getCategoryVisualTemplate } from "@/lib/news/ai/editorial-image-brand";
import { optimizeCdnImageUrl } from "@/lib/news/images/responsive-sizes";

const REGION_FALLBACKS: Record<string, string> = {
  chhattisgarh: EDITORIAL_IMAGES.civicOffice,
  raipur: EDITORIAL_IMAGES.civicOffice,
  bastar: EDITORIAL_IMAGES.folkCulture,
  india: EDITORIAL_IMAGES.civicOffice,
};

const SOURCE_FALLBACKS: Record<string, string> = {
  "dainik bhaskar": EDITORIAL_IMAGES.newsroomDesk,
  bhaskar: EDITORIAL_IMAGES.newsroomDesk,
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
  rss: EDITORIAL_IMAGES.newsroomDesk,
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
  headline?: string | null;
  tags?: string[];
}): { url: string; tier: FallbackTier; fallbackKey: string } {
  const storyText = [input.headline ?? "", input.category, ...(input.tags ?? [])]
    .join(" ")
    .toLocaleLowerCase();
  const topicFallbacks: Array<[RegExp, string, keyof typeof EDITORIAL_IMAGES]> = [
    [/\b(ai|artificial intelligence|technology|digital|software|cyber)\b|तकनीक|डिजिटल|एआई/i, "technology", "newsroomDesk"],
    [/\b(cricket|sport|match|tournament)\b|क्रिकेट|खेल/i, "sports", "cricketGround"],
    [/\b(health|hospital|medical|doctor)\b|स्वास्थ्य|अस्पताल|चिकित्सा/i, "health", "ruralHealth"],
    [/\b(school|college|student|education|exam)\b|स्कूल|शिक्षा|परीक्षा/i, "education", "schoolIndia"],
    [/\b(market|business|finance|industry|power|trade|stock)\b|बाजार|व्यापार|उद्योग|बिजली/i, "business", "steelIndustry"],
    [/\b(assembly|election|minister|government|politics)\b|विधानसभा|चुनाव|सरकार|मंत्री/i, "politics", "assemblyPolitics"],
    [/\b(water|rain|monsoon|river|weather)\b|पानी|बारिश|मानसून|नदी|मौसम/i, "weather", "waterCivic"],
    [/\b(culture|festival|entertainment|film)\b|संस्कृति|त्योहार|मनोरंजन|फिल्म/i, "culture", "folkCulture"],
    [/\b(traffic|city|road|raipur)\b|यातायात|शहर|सड़क|रायपुर/i, "city", "waterCivic"],
  ];
  for (const [pattern, key, imageKey] of topicFallbacks) {
    if (pattern.test(storyText)) {
      return {
        url: optimizeCdnImageUrl(EDITORIAL_IMAGES[imageKey], 1200),
        tier: "category_curated",
        fallbackKey: key,
      };
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
  if (url) return {
    url: optimizeCdnImageUrl(url ?? EDITORIAL_IMAGES.newsroomDesk, 1200),
    tier: "category_curated",
    fallbackKey: template.fallbackKey,
  };

  if (input.source) {
    const key = input.source.toLowerCase();
    for (const [needle, sourceUrl] of Object.entries(SOURCE_FALLBACKS)) {
      if (key.includes(needle)) {
        return {
          url: optimizeCdnImageUrl(sourceUrl, 1200),
          tier: "source_extracted",
          fallbackKey: needle,
        };
      }
    }
  }

  return {
    url: optimizeCdnImageUrl(EDITORIAL_IMAGES.newsroomDesk, 1200),
    tier: "branded_placeholder",
    fallbackKey: "newsroomDesk",
  };
}
