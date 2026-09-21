/**
 * Category SEO hub definitions — multilingual titles, keywords, slugs
 */

import type { NewsCategory } from "@/lib/types/news-article";
import type { HomeSectionId } from "@/lib/homepage/types";

export type CategorySeoSlug =
  | NewsCategory
  | HomeSectionId
  | "jobs"
  | "crime"
  | "startup"
  | "agriculture";

export type CategorySeoConfig = {
  slug: CategorySeoSlug;
  path: string;
  titleEn: string;
  titleHi: string;
  descriptionEn: string;
  descriptionHi: string;
  keywords: string[];
  newsCategory: NewsCategory;
  sectionId?: HomeSectionId;
};

const BASE_KEYWORDS = [
  "India news",
  "Jan Darpan — India",
  "जन दर्पण — भारत",
  "भारत समाचार",
  "देश की ताज़ा खबरें",
];

export const CATEGORY_SEO: CategorySeoConfig[] = [
  {
    slug: "local",
    path: "/category/local",
    titleEn: "Regional & State News India",
    titleHi: "राज्य और क्षेत्रीय समाचार",
    descriptionEn:
      "Latest regional headlines, governance, and state-level developments from across India.",
    descriptionHi:
      "देशभर के राज्यों और क्षेत्रों की ताज़ा खबरें, प्रशासन और जनहित के मुद्दे।",
    keywords: [...BASE_KEYWORDS, "state news India", "regional headlines"],
    newsCategory: "local",
    sectionId: "india",
  },
  {
    slug: "chhattisgarh",
    path: "/category/chhattisgarh",
    titleEn: "State News & Reports",
    titleHi: "राज्य समाचार",
    descriptionEn: "State-level developments, public interest news, and ground reports.",
    descriptionHi: "विभिन्न राज्यों की प्रमुख खबरें, नीतियां और महत्वपूर्ण घटनाक्रम।",
    keywords: [...BASE_KEYWORDS, "state news", "regional updates"],
    newsCategory: "local",
    sectionId: "india",
  },
  {
    slug: "raipur",
    path: "/category/raipur",
    titleEn: "City & Civic News",
    titleHi: "शहर व नागरिक समाचार",
    descriptionEn: "Urban civic updates, infrastructure, and local administration reports.",
    descriptionHi: "शहरी प्रशासन, नागरिक सुविधाएं और बुनियादी ढांचे से जुड़े समाचार।",
    keywords: [...BASE_KEYWORDS, "city news", "civic updates"],
    newsCategory: "local",
    sectionId: "india",
  },
  {
    slug: "politics",
    path: "/category/politics",
    titleEn: "National Politics & Government",
    titleHi: "राष्ट्रीय राजनीति और सरकार",
    descriptionEn: "National politics, policy decisions, Parliament, government initiatives, and elections across India.",
    descriptionHi: "राष्ट्रीय राजनीति, संसद, सरकारी नीतियां, योजनाएं और देशव्यापी राजनीतिक घटनाक्रम।",
    keywords: [...BASE_KEYWORDS, "India politics", "election news", "parliament updates"],
    newsCategory: "politics",
    sectionId: "india",
  },
  {
    slug: "business",
    path: "/category/business",
    titleEn: "Business, Economy & Markets",
    titleHi: "व्यापार, अर्थव्यवस्था व बाजार",
    descriptionEn: "Indian economy, stock market, banking, gold & silver rates, fuel prices, and business developments.",
    descriptionHi: "भारतीय अर्थव्यवस्था, शेयर बाजार, बैंकिंग, सोना-चांदी भाव, पेट्रोल-डीजल दरें और व्यापार जगत।",
    keywords: [...BASE_KEYWORDS, "India business", "economy India", "stock market India"],
    newsCategory: "business",
    sectionId: "business",
  },
  {
    slug: "sports",
    path: "/category/sports",
    titleEn: "Sports News India",
    titleHi: "खेल समाचार",
    descriptionEn: "Cricket, team India fixtures, tournament analysis, and major sporting events.",
    descriptionHi: "क्रिकेट, टीम इंडिया, प्रमुख टूर्नामेंट, मैच रिपोर्ट और खेल जगत की ताज़ा खबरें।",
    keywords: [...BASE_KEYWORDS, "cricket news", "India sports", "IPL news"],
    newsCategory: "sports",
    sectionId: "sports",
  },
  {
    slug: "health",
    path: "/category/health",
    titleEn: "Health & Wellness",
    titleHi: "स्वास्थ्य और चिकित्सा",
    descriptionEn: "Public health, medical developments, wellness, and healthcare policies in India.",
    descriptionHi: "स्वास्थ्य सेवाएं, चिकित्सा जगत, पोषण और स्वास्थ्य नीति से जुड़ी खबरें।",
    keywords: [...BASE_KEYWORDS, "health news India", "wellness"],
    newsCategory: "health",
    sectionId: "education",
  },
  {
    slug: "education",
    path: "/category/education",
    titleEn: "Education & Exams",
    titleHi: "शिक्षा और परीक्षाएं",
    descriptionEn: "Boards, college admissions, competitive entrance exams, results, and education policy across India.",
    descriptionHi: "बोर्ड परीक्षाएं, प्रवेश परीक्षाएं, रिजल्ट्स, विश्वविद्यालय और शिक्षा नीति की ताज़ा जानकारी।",
    keywords: [...BASE_KEYWORDS, "education India", "exam results", "board exams"],
    newsCategory: "health",
    sectionId: "education",
  },
  {
    slug: "technology",
    path: "/category/technology",
    titleEn: "Technology & AI",
    titleHi: "तकनीक और एआई",
    descriptionEn: "Artificial intelligence, smartphones, gadgets, digital India, and major tech innovations.",
    descriptionHi: "आर्टिफिशियल इंटेलिजेंस (AI), स्मार्टफोन, तकनीक, गैजेट्स और डिजिटल इंडिया के प्रमुख बदलाव।",
    keywords: [...BASE_KEYWORDS, "tech news India", "AI news", "smartphones"],
    newsCategory: "technology",
    sectionId: "business",
  },
  {
    slug: "world",
    path: "/category/world",
    titleEn: "World & Global Affairs",
    titleHi: "विश्व समाचार",
    descriptionEn: "International headlines, global geopolitics, and international events affecting India.",
    descriptionHi: "अंतर्राष्ट्रीय घटनाक्रम, वैश्विक राजनीति और भारत से जुड़े विदेशी मामले।",
    keywords: [...BASE_KEYWORDS, "world news Hindi", "global affairs"],
    newsCategory: "world",
    sectionId: "world",
  },
  {
    slug: "entertainment",
    path: "/category/entertainment",
    titleEn: "Entertainment & Cinema",
    titleHi: "मनोरंजन और सिनेमा",
    descriptionEn: "Cinema, streaming releases, culture, and trending entertainment stories across India.",
    descriptionHi: "सिनेमा, ओटीटी, कला, संस्कृति और मनोरंजन जगत की चर्चित खबरें।",
    keywords: [...BASE_KEYWORDS, "cinema news", "entertainment India"],
    newsCategory: "entertainment",
    sectionId: "world",
  },
  {
    slug: "jobs",
    path: "/category/jobs",
    titleEn: "Government Jobs & Careers",
    titleHi: "सरकारी नौकरी और रोजगार",
    descriptionEn: "Sarkari naukri, recruitment notifications, admit cards, and job updates across India.",
    descriptionHi: "सरकारी नौकरी, भर्ती अधिसूचनाएं, प्रवेश पत्र और रोजगार के अवसर।",
    keywords: [...BASE_KEYWORDS, "sarkari naukri", "recruitment India", "govt jobs"],
    newsCategory: "business",
    sectionId: "business",
  },
  {
    slug: "crime",
    path: "/category/crime",
    titleEn: "Courts, Law & Justice",
    titleHi: "कानून, अदालत और न्याय",
    descriptionEn: "Supreme Court, High Courts, major legal developments, and law enforcement in India.",
    descriptionHi: "सुप्रीम कोर्ट, उच्च न्यायालय, कानूनी फैसले और कानून व्यवस्था से जुड़ी खबरें।",
    keywords: [...BASE_KEYWORDS, "court news", "legal news India", "supreme court"],
    newsCategory: "politics",
    sectionId: "india",
  },
  {
    slug: "startup",
    path: "/category/startup",
    titleEn: "Startup & Innovation",
    titleHi: "स्टार्टअप और इनोवेशन",
    descriptionEn: "Startups, founders, and innovation economy across India.",
    descriptionHi: "स्टार्टअप, उद्यमी और इनोवेशन — भारत।",
    keywords: [...BASE_KEYWORDS, "startup India", "founder", "innovation"],
    newsCategory: "technology",
    sectionId: "business",
  },
  {
    slug: "agriculture",
    path: "/category/agriculture",
    titleEn: "Agriculture & Rural",
    titleHi: "कृषि और ग्रामीण",
    descriptionEn: "Farming, MSP, monsoon, and rural economy across India.",
    descriptionHi: "खेती, एमएसपी, मानसून और ग्रामीण अर्थव्यवस्था।",
    keywords: [...BASE_KEYWORDS, "kisan", "MSP", "monsoon India", "agriculture"],
    newsCategory: "business",
    sectionId: "business",
  },
];

const BY_SLUG = new Map(CATEGORY_SEO.map((c) => [c.slug, c]));

export function getCategorySeo(slug: string): CategorySeoConfig | null {
  return BY_SLUG.get(slug as CategorySeoSlug) ?? null;
}

export function getAllCategorySlugs(): CategorySeoSlug[] {
  return CATEGORY_SEO.map((c) => c.slug);
}

export function categoryPath(slug: string): string {
  return `/category/${slug}`;
}

export function matchesCategoryArticle(
  config: CategorySeoConfig,
  input: { category: string; tags?: string[]; headline?: string; summary?: string }
): boolean {
  if (input.category === config.newsCategory) return true;
  const text = `${input.headline ?? ""} ${input.summary ?? ""} ${(input.tags ?? []).join(" ")}`.toLowerCase();
  if (config.sectionId && text.includes(config.sectionId)) return true;
  return config.keywords.some((k) => text.includes(k.toLowerCase().slice(0, 12)));
}
