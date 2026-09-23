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

/**
 * Detect semantic topic category based on category, title, or headline keywords.
 * Prevents generic city image reuse across unrelated stories (farming, cricket, crime, weather, etc.).
 */
export function detectSemanticTopic(
  category?: string | null,
  title?: string | null
): string | null {
  const text = `${category ?? ""} ${title ?? ""}`.toLowerCase();

  // Agriculture / Farming / Rural produce
  if (
    /(kisan|farmer|agriculture|crop|paddy|farming|coconut|harvest|mandi|krishi|किसान|खेती|धान|फसल|कृषि|नारियल|अन्नदाता|उर्वरक|खाद|सिंचाई)/i.test(
      text
    )
  ) {
    return "agriculture";
  }
  // Cricket / Sports
  if (
    /(cricket|match|ipl|tournament|stadium|wicket|player|badminton|football|olympics|sports|क्रिकेट|मैच|खेल|खिलाड़ी|टूर्नामेंट|स्टेडियम|पदक|दौड़)/i.test(
      text
    )
  ) {
    return "sports";
  }
  // Weather / Monsoon / Climate
  if (
    /(weather|rain|monsoon|heatwave|temperature|cyclone|rainfall|forecast|cold|storm|मौसम|बारिश|मानसून|तापमान|गर्मी|सर्दी|कोहरा|ठंड|ओलावृष्टि|चक्रवात)/i.test(
      text
    )
  ) {
    return "weather";
  }
  // Crime / Police / Court / Legal
  if (
    /(police|crime|arrest|murder|theft|court|judiciary|fir|scam|fraud|custody|jail|क्राइम|पुलिस|गिरफ्तार|अदालत|कोर्ट|आरोपी|वारदात|हत्या|चोरी|घोटाला|जेल|हिरासत)/i.test(
      text
    )
  ) {
    return "crime";
  }
  // Education / Exams / Students
  if (
    /(school|college|exam|university|education|student|iit|cbse|results|admit card|शिक्षा|स्कूल|कॉलेज|छात्र|परीक्षा|विद्यार्थी|आईआईटी|यूनिवर्सिटी|नतीजे)/i.test(
      text
    )
  ) {
    return "education";
  }
  // Health / Medical / Hospitals
  if (
    /(health|hospital|doctor|patient|disease|medicine|medical|virus|vaccine|चिकित्सा|अस्पताल|डॉक्टर|मरीज|बीमारी|स्वास्थ्य|दवा|वैक्सीन)/i.test(
      text
    )
  ) {
    return "health";
  }
  // Technology / IT / AI / Digital
  if (
    /(technology|digital|ai|software|cyber|internet|gadget|space|isro|तकनीक|डिजिटल|साइबर|इंटरनेट|कंप्यूटर|सॉफ्टवेयर|एआई)/i.test(
      text
    )
  ) {
    return "technology";
  }
  // Politics / Government / Assembly / Elections
  if (
    /(assembly|election|minister|cabinet|cm|bjp|congress|parliament|governance|mla|mp|विधानसभा|चुनाव|मंत्री|मुख्यमंत्री|मंत्रिमंडल|राजनीति|सांसद|विधायक|लोकसभा)/i.test(
      text
    )
  ) {
    return "politics";
  }
  // Business / Economy / Market / Industry
  if (
    /(business|market|trade|economy|industry|shares|sensex|rbi|tax|व्यापार|बाजार|उद्योग|अर्थव्यवस्था|शेयर|सेंसेक्स|कारोबार|जीएसटी)/i.test(
      text
    )
  ) {
    return "business";
  }
  return null;
}

export function resolveContextualFallback(input: {
  category: string;
  region?: string | null;
  source?: string | null;
  title?: string | null;
  headline?: string | null;
}): { url: string; tier: FallbackTier; fallbackKey: string } {
  const headline = input.headline ?? input.title;
  const topic = detectSemanticTopic(input.category, headline);

  if (topic) {
    const template = getCategoryVisualTemplate(topic);
    const url = EDITORIAL_IMAGES[template.fallbackKey as CategoryFallbackKey];
    if (url) {
      return {
        url: optimizeCdnImageUrl(url, 1200),
        tier: "category_curated",
        fallbackKey: template.fallbackKey,
      };
    }
  }

  // Next: direct category template
  const template = getCategoryVisualTemplate(input.category);
  if (template && template.fallbackKey !== "raipurCity") {
    const url = EDITORIAL_IMAGES[template.fallbackKey as CategoryFallbackKey];
    if (url) {
      return {
        url: optimizeCdnImageUrl(url, 1200),
        tier: "category_curated",
        fallbackKey: template.fallbackKey,
      };
    }
  }

  // If general/local category, check regional fallback
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

  const fallbackUrl =
    EDITORIAL_IMAGES[template?.fallbackKey as CategoryFallbackKey] ??
    EDITORIAL_IMAGES.newsroomDesk;
  return {
    url: optimizeCdnImageUrl(fallbackUrl, 1200),
    tier: "category_curated",
    fallbackKey: template?.fallbackKey ?? "newsroomDesk",
  };
}

