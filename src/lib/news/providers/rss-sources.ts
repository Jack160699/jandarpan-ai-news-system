/**
 * Chhattisgarh RSS catalog — reliable aggregators + publishers
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

/** Google News RSS — highly reliable regional fallback */
export function googleNewsRss(query: string, lang: "hi" | "en"): string {
  const hl = lang === "hi" ? "hi" : "en-IN";
  const ceid = lang === "hi" ? "IN:hi" : "IN:en";
  return `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=${hl}&gl=IN&ceid=${ceid}`;
}

export const RSS_SOURCES: RSSSource[] = [
  // ── Google News aggregators (reliable) ──
  {
    id: "gnews-cg-en",
    name: "Google News — Chhattisgarh (EN)",
    category: "local",
    language: "en",
    region: "cg",
    url: googleNewsRss("Chhattisgarh", "en"),
    priority: 98,
    tier: "aggregator",
  },
  {
    id: "gnews-cg-hi",
    name: "Google News — छत्तीसगढ़ (HI)",
    category: "local",
    language: "hi",
    region: "cg",
    url: googleNewsRss("छत्तीसगढ़", "hi"),
    priority: 99,
    tier: "aggregator",
  },
  {
    id: "gnews-raipur",
    name: "Google News — Raipur",
    category: "local",
    language: "hi",
    region: "cg",
    url: googleNewsRss("Raipur Chhattisgarh news", "hi"),
    priority: 96,
    tier: "aggregator",
  },
  {
    id: "gnews-bilaspur",
    name: "Google News — Bilaspur CG",
    category: "local",
    language: "hi",
    region: "cg",
    url: googleNewsRss("Bilaspur Chhattisgarh", "hi"),
    priority: 88,
    tier: "aggregator",
  },
  {
    id: "gnews-bastar",
    name: "Google News — Bastar",
    category: "local",
    language: "hi",
    region: "cg",
    url: googleNewsRss("Bastar Chhattisgarh", "hi"),
    priority: 86,
    tier: "aggregator",
  },
  {
    id: "gnews-durg",
    name: "Google News — Durg CG",
    category: "local",
    language: "hi",
    region: "cg",
    url: googleNewsRss("Durg Chhattisgarh news", "hi"),
    priority: 86,
    tier: "aggregator",
  },
  {
    id: "gnews-cg-politics",
    name: "Google News — CG Politics",
    category: "politics",
    language: "hi",
    region: "cg",
    url: googleNewsRss("Chhattisgarh politics", "hi"),
    priority: 90,
    tier: "aggregator",
  },
  {
    id: "gnews-cg-crime",
    name: "Google News — CG Crime",
    category: "local",
    language: "hi",
    region: "cg",
    url: googleNewsRss("Chhattisgarh crime news", "hi"),
    priority: 82,
    tier: "aggregator",
  },
  {
    id: "gnews-cg-education",
    name: "Google News — CG Education",
    category: "local",
    language: "hi",
    region: "cg",
    url: googleNewsRss("Chhattisgarh education", "hi"),
    priority: 80,
    tier: "aggregator",
  },
  {
    id: "gnews-cg-business",
    name: "Google News — CG Business",
    category: "business",
    language: "hi",
    region: "cg",
    url: googleNewsRss("Chhattisgarh business economy", "hi"),
    priority: 80,
    tier: "aggregator",
  },

  // ── Official / publisher feeds ──
  {
    id: "pib-india",
    name: "PIB India",
    category: "politics",
    language: "en",
    region: "india",
    url: "https://pib.gov.in/WriteReadData/rss/rsseng.xml",
    priority: 85,
    tier: "publisher",
  },
  {
    id: "pib-hindi",
    name: "PIB Hindi",
    category: "politics",
    language: "hi",
    region: "india",
    url: "https://pib.gov.in/WriteReadData/rss/rsshind.xml",
    priority: 84,
    tier: "publisher",
  },
  {
    id: "dd-news",
    name: "DD News",
    category: "politics",
    language: "hi",
    region: "india",
    url: "https://ddnews.gov.in/rss.aspx?id=1&lang=1",
    priority: 78,
    tier: "publisher",
  },

  // ── Regional Hindi publishers ──
  {
    id: "etv-cg",
    name: "ETV Bharat — Chhattisgarh",
    category: "local",
    language: "hi",
    region: "cg",
    url: "https://www.etvbharat.com/feed/chhattisgarh",
    priority: 92,
    tier: "publisher",
  },
  {
    id: "jagran-cg",
    name: "Jagran — Chhattisgarh",
    category: "local",
    language: "hi",
    region: "cg",
    url: "https://www.jagran.com/rss/chhattisgarh.xml",
    priority: 88,
    tier: "publisher",
  },
  {
    id: "zee-mpcg",
    name: "Zee News — MP/CG",
    category: "local",
    language: "hi",
    region: "cg",
    url: "https://zeenews.india.com/rss/india/madhya-pradesh-chhattisgarh-news.xml",
    priority: 86,
    tier: "publisher",
  },
  {
    id: "amarujala-cg",
    name: "Amar Ujala — Chhattisgarh",
    category: "local",
    language: "hi",
    region: "cg",
    url: "https://www.amarujala.com/rss/chhattisgarh.xml",
    priority: 84,
    tier: "publisher",
  },
  {
    id: "livehindustan-cg",
    name: "Live Hindustan — Chhattisgarh",
    category: "local",
    language: "hi",
    region: "cg",
    url: "https://www.livehindustan.com/rss/chhattisgarh",
    priority: 82,
    tier: "publisher",
  },
  {
    id: "webdunia-cg",
    name: "WebDunia — Chhattisgarh",
    category: "local",
    language: "hi",
    region: "cg",
    url: "https://hindi.webdunia.com/rss/chhattisgarh.xml",
    priority: 76,
    tier: "publisher",
  },
  {
    id: "patrika-cg",
    name: "Patrika — Chhattisgarh",
    category: "local",
    language: "hi",
    region: "cg",
    url: "https://www.patrika.com/rss/chhattisgarh-news.xml",
    priority: 74,
    tier: "publisher",
  },
];

export const RSS_FEED_TIMEOUT_MS = 8_000;
export const RSS_MAX_RETRIES = 2;
export const RSS_MAX_CONSECUTIVE_FAILURES = 3;
export const RSS_DISABLE_HOURS = 12;
export const RSS_MAX_ARTICLE_AGE_DAYS = 10;
export const RSS_PARALLEL_BATCH = 5;
export const RSS_PAGE_ENRICH_LIMIT = 20;

export function regionToDbRegion(
  region: RSSSource["region"]
): "chhattisgarh" | "india" | "global" {
  if (region === "cg") return "chhattisgarh";
  if (region === "global") return "global";
  return "india";
}

export function isGoogleNewsSource(sourceId: string): boolean {
  return sourceId.startsWith("gnews-");
}
