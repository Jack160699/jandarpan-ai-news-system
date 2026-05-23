/**
 * Category SEO hub definitions — multilingual titles, keywords, slugs
 */

import type { NewsCategory } from "@/lib/types/news-article";
import type { HomeSectionId } from "@/lib/homepage/types";

export type CategorySeoSlug = NewsCategory | HomeSectionId;

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
  "Chhattisgarh news",
  "Hamar Chhattisgarh",
  "हमार छत्तीसगढ़",
  "छत्तीसगढ़ समाचार",
];

export const CATEGORY_SEO: CategorySeoConfig[] = [
  {
    slug: "local",
    path: "/category/local",
    titleEn: "Chhattisgarh Local News",
    titleHi: "छत्तीसगढ़ स्थानीय समाचार",
    descriptionEn:
      "Latest local news from Raipur, Bastar, Bilaspur, Durg, and districts across Chhattisgarh.",
    descriptionHi:
      "रायपुर, बस्तर, बिलासपुर, दुर्ग और छत्तीसगढ़ के सभी जिलों की ताज़ा स्थानीय खबरें।",
    keywords: [...BASE_KEYWORDS, "local news CG", "district news"],
    newsCategory: "local",
    sectionId: "chhattisgarh",
  },
  {
    slug: "chhattisgarh",
    path: "/category/chhattisgarh",
    titleEn: "Chhattisgarh News",
    titleHi: "छत्तीसगढ़ समाचार",
    descriptionEn: "Statewide Chhattisgarh headlines, policy, and regional developments.",
    descriptionHi: "पूरे छत्तीसगढ़ की बड़ी खबरें, नीति और क्षेत्रीय घटनाक्रम।",
    keywords: [...BASE_KEYWORDS, "state news", "CG headlines"],
    newsCategory: "local",
    sectionId: "chhattisgarh",
  },
  {
    slug: "raipur",
    path: "/category/raipur",
    titleEn: "Raipur News",
    titleHi: "रायपुर समाचार",
    descriptionEn: "Raipur city desk — civic, infrastructure, and capital region updates.",
    descriptionHi: "रायपुर शहर — नगर निगम, बुनियादी ढांचा और राजधानी क्षेत्र की खबरें।",
    keywords: [...BASE_KEYWORDS, "Raipur news today", "Naya Raipur"],
    newsCategory: "local",
    sectionId: "raipur",
  },
  {
    slug: "politics",
    path: "/category/politics",
    titleEn: "Politics & India News",
    titleHi: "राजनीति और भारत समाचार",
    descriptionEn: "National politics, policy, and government coverage with CG relevance.",
    descriptionHi: "राष्ट्रीय राजनीति, नीति और सरकारी फैसले — छत्तीसगढ़ संदर्भ के साथ।",
    keywords: [...BASE_KEYWORDS, "India politics", "election news"],
    newsCategory: "politics",
    sectionId: "india",
  },
  {
    slug: "business",
    path: "/category/business",
    titleEn: "Business & Economy",
    titleHi: "व्यापार और अर्थव्यवस्था",
    descriptionEn: "Markets, industry, coal, steel, and Chhattisgarh economic desk coverage.",
    descriptionHi: "बाजार, उद्योग, कोयला-स्टील और छत्तीसगढ़ आर्थिक डेस्क।",
    keywords: [...BASE_KEYWORDS, "CG business", "economy India"],
    newsCategory: "business",
    sectionId: "business",
  },
  {
    slug: "sports",
    path: "/category/sports",
    titleEn: "Sports News",
    titleHi: "खेल समाचार",
    descriptionEn: "Cricket, state sports, and national fixtures relevant to CG readers.",
    descriptionHi: "क्रिकेट, राज्य खेल और राष्ट्रीय मैच — छत्तीसगढ़ पाठकों के लिए।",
    keywords: [...BASE_KEYWORDS, "cricket news", "CG sports"],
    newsCategory: "sports",
    sectionId: "sports",
  },
  {
    slug: "health",
    path: "/category/health",
    titleEn: "Health & Education",
    titleHi: "स्वास्थ्य और शिक्षा",
    descriptionEn: "Public health, schools, exams, and education policy in Chhattisgarh.",
    descriptionHi: "स्वास्थ्य सेवा, स्कूल, परीक्षा और शिक्षा नीति — छत्तीसगढ़।",
    keywords: [...BASE_KEYWORDS, "health news CG", "education CG"],
    newsCategory: "health",
    sectionId: "education",
  },
  {
    slug: "education",
    path: "/category/education",
    titleEn: "Education News",
    titleHi: "शिक्षा समाचार",
    descriptionEn: "Schools, exams, scholarships, and education policy in Chhattisgarh.",
    descriptionHi: "स्कूल, परीक्षा, छात्रवृत्ति और शिक्षा नीति — छत्तीसगढ़।",
    keywords: [...BASE_KEYWORDS, "education CG", "school news"],
    newsCategory: "health",
    sectionId: "education",
  },
  {
    slug: "technology",
    path: "/category/technology",
    titleEn: "Technology News",
    titleHi: "तकनीक समाचार",
    descriptionEn: "Digital India, startups, and tech policy with regional impact.",
    descriptionHi: "डिजिटल इंडिया, स्टार्टअप और तकनीकी नीति — क्षेत्रीय प्रभाव के साथ।",
    keywords: [...BASE_KEYWORDS, "tech news India"],
    newsCategory: "technology",
    sectionId: "business",
  },
  {
    slug: "world",
    path: "/category/world",
    titleEn: "World News",
    titleHi: "विश्व समाचार",
    descriptionEn: "International headlines curated for Indian regional readers.",
    descriptionHi: "अंतर्राष्ट्रीय खबरें — भारतीय क्षेत्रीय पाठकों के लिए संपादित।",
    keywords: [...BASE_KEYWORDS, "world news Hindi"],
    newsCategory: "world",
    sectionId: "world",
  },
  {
    slug: "entertainment",
    path: "/category/entertainment",
    titleEn: "Entertainment",
    titleHi: "मनोरंजन",
    descriptionEn: "Film, culture, and entertainment from Chhattisgarh and India.",
    descriptionHi: "फिल्म, संस्कृति और मनोरंजन — छत्तीसगढ़ और भारत।",
    keywords: [...BASE_KEYWORDS, "CG culture", "Bollywood news"],
    newsCategory: "entertainment",
    sectionId: "world",
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
