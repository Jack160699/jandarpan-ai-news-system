/**
 * National India RSS catalog — reliable aggregators + publishers
 * tier: publisher (official) > aggregator (Google News, PIB) > scraped
 */

export type RSSSourceTier = "publisher" | "aggregator" | "scraped";

export type RSSSource = {
  id: string;
  name: string;
  category: string;
  language: "hi" | "en";
  region: "cg" | "india" | "global";
  url: string;
  /** Base priority; tier bonus applied in rss.ts */
  priority: number;
  tier: RSSSourceTier;
};

const TIER_BONUS: Record<RSSSourceTier, number> = {
  publisher: 25,
  aggregator: 12,
  scraped: 0,
};

export function sourceEffectivePriority(source: RSSSource): number {
  return source.priority + TIER_BONUS[source.tier];
}

/** Google News RSS — reliable national news aggregator */
export function googleNewsRss(query: string, lang: "hi" | "en"): string {
  const hl = lang === "hi" ? "hi" : "en-IN";
  const ceid = lang === "hi" ? "IN:hi" : "IN:en";
  return `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=${hl}&gl=IN&ceid=${ceid}`;
}

export const RSS_SOURCES: RSSSource[] = [
  // ── National Google News aggregators (High Search Demand) ──
  {
    id: "gnews-india-hi",
    name: "Google News — भारत समाचार (HI)",
    category: "politics",
    language: "hi",
    region: "india",
    url: googleNewsRss("भारत ताज़ा समाचार", "hi"),
    priority: 100,
    tier: "aggregator",
  },
  {
    id: "gnews-india-en",
    name: "Google News — India Top Stories (EN)",
    category: "politics",
    language: "en",
    region: "india",
    url: googleNewsRss("India news top stories", "en"),
    priority: 99,
    tier: "aggregator",
  },
  {
    id: "gnews-breaking-india",
    name: "Google News — Breaking News India",
    category: "politics",
    language: "hi",
    region: "india",
    url: googleNewsRss("देश बड़ी खबरें आज", "hi"),
    priority: 98,
    tier: "aggregator",
  },
  {
    id: "gnews-national-politics",
    name: "Google News — National Politics (HI)",
    category: "politics",
    language: "hi",
    region: "india",
    url: googleNewsRss("राष्ट्रीय राजनीति संसद केंद्र सरकार", "hi"),
    priority: 95,
    tier: "aggregator",
  },
  {
    id: "gnews-business-economy",
    name: "Google News — Business & Economy (HI)",
    category: "business",
    language: "hi",
    region: "india",
    url: googleNewsRss("व्यापार अर्थव्यवस्था शेयर बाजार सोना चांदी", "hi"),
    priority: 94,
    tier: "aggregator",
  },
  {
    id: "gnews-business-en",
    name: "Google News — Business & Markets (EN)",
    category: "business",
    language: "en",
    region: "india",
    url: googleNewsRss("Indian economy stock market business", "en"),
    priority: 92,
    tier: "aggregator",
  },
  {
    id: "gnews-jobs-recruitment",
    name: "Google News — Sarkari Naukri & Jobs (HI)",
    category: "business",
    language: "hi",
    region: "india",
    url: googleNewsRss("सरकारी नौकरी भर्ती रिजल्ट एडमिट कार्ड", "hi"),
    priority: 96,
    tier: "aggregator",
  },
  {
    id: "gnews-education-exams",
    name: "Google News — Education & Exams (HI)",
    category: "education",
    language: "hi",
    region: "india",
    url: googleNewsRss("शिक्षा बोर्ड परीक्षा रिजल्ट यूनिवर्सिटी", "hi"),
    priority: 91,
    tier: "aggregator",
  },
  {
    id: "gnews-technology-ai",
    name: "Google News — Tech & AI (EN)",
    category: "business",
    language: "en",
    region: "india",
    url: googleNewsRss("technology smartphones AI India", "en"),
    priority: 90,
    tier: "aggregator",
  },
  {
    id: "gnews-schemes-agriculture",
    name: "Google News — Government Schemes & Kisan (HI)",
    category: "politics",
    language: "hi",
    region: "india",
    url: googleNewsRss("सरकारी योजना किसान योजना भारत सरकार", "hi"),
    priority: 93,
    tier: "aggregator",
  },
  {
    id: "gnews-sports-cricket",
    name: "Google News — Sports & Cricket (HI)",
    category: "sports",
    language: "hi",
    region: "india",
    url: googleNewsRss("क्रिकेट खेल समाचार भारत", "hi"),
    priority: 88,
    tier: "aggregator",
  },
  {
    id: "gnews-health-wellness",
    name: "Google News — Health & Wellness (HI)",
    category: "education",
    language: "hi",
    region: "india",
    url: googleNewsRss("स्वास्थ्य चिकित्सा स्वास्थ्य सेवाएं भारत", "hi"),
    priority: 85,
    tier: "aggregator",
  },

  // ── Official / Publisher feeds ──
  {
    id: "pib-india",
    name: "PIB India",
    category: "politics",
    language: "en",
    region: "india",
    url: "https://pib.gov.in/WriteReadData/rss/rsseng.xml",
    priority: 95,
    tier: "publisher",
  },
  {
    id: "pib-hindi",
    name: "PIB Hindi",
    category: "politics",
    language: "hi",
    region: "india",
    url: "https://pib.gov.in/WriteReadData/rss/rsshind.xml",
    priority: 95,
    tier: "publisher",
  },
  {
    id: "dd-news",
    name: "DD News",
    category: "politics",
    language: "hi",
    region: "india",
    url: "https://ddnews.gov.in/rss.aspx?id=1&lang=1",
    priority: 90,
    tier: "publisher",
  },
  {
    id: "jagran-national",
    name: "Jagran — National",
    category: "politics",
    language: "hi",
    region: "india",
    url: "https://www.jagran.com/rss/national.xml",
    priority: 92,
    tier: "publisher",
  },
  {
    id: "amarujala-national",
    name: "Amar Ujala — National",
    category: "politics",
    language: "hi",
    region: "india",
    url: "https://www.amarujala.com/rss/national.xml",
    priority: 90,
    tier: "publisher",
  },
  {
    id: "livehindustan-national",
    name: "Live Hindustan — National",
    category: "politics",
    language: "hi",
    region: "india",
    url: "https://www.livehindustan.com/rss/national",
    priority: 89,
    tier: "publisher",
  },
  {
    id: "zee-india",
    name: "Zee News — India National",
    category: "politics",
    language: "hi",
    region: "india",
    url: "https://zeenews.india.com/rss/india-national-news.xml",
    priority: 88,
    tier: "publisher",
  },

  // ── International events affecting India ──
  {
    id: "bbc-world",
    name: "BBC News — World",
    category: "world",
    language: "en",
    region: "global",
    url: "https://feeds.bbci.co.uk/news/world/rss.xml",
    priority: 80,
    tier: "publisher",
  },
  {
    id: "gnews-world-india-relevant",
    name: "Google News — International news for India",
    category: "world",
    language: "en",
    region: "global",
    url: googleNewsRss("international news India", "en"),
    priority: 78,
    tier: "aggregator",
  },
];

export const RSS_FEED_TIMEOUT_MS = 8_000;
export const RSS_MAX_RETRIES = 2;
export const RSS_MAX_CONSECUTIVE_FAILURES = 3;
export const RSS_DISABLE_HOURS = 12;
/** After this many consecutive failures with no success, permanently retire. */
export const RSS_PERMANENT_RETIRE_FAILURES = 40;
/** Long cooldown used for permanent retirement (effectively never on normal runs). */
export const RSS_PERMANENT_DISABLE_YEARS = 10;
export const RSS_MAX_ARTICLE_AGE_DAYS = 10;
export const RSS_PARALLEL_BATCH = 5;
export const RSS_PAGE_ENRICH_LIMIT = 20;

export function regionToDbRegion(
  region: RSSSource["region"]
): "chhattisgarh" | "india" | "global" {
  if (region === "global") return "global";
  return "india";
}

export function isGoogleNewsSource(sourceId: string): boolean {
  return sourceId.startsWith("gnews-");
}
