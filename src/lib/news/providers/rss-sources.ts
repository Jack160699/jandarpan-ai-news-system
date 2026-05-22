/**
 * Chhattisgarh & MPCG regional RSS catalog — prioritized sources
 * Update URLs if a publisher changes their feed endpoint.
 */

export type RSSSource = {
  id: string;
  name: string;
  category: string;
  language: "hi" | "en";
  region: "cg" | "india" | "global";
  url: string;
  priority: number;
};

/** Higher priority = preferred when deduping duplicate stories across feeds */
export const RSS_SOURCES: RSSSource[] = [
  // ── Chhattisgarh local (priority 90–100) ──
  {
    id: "bhaskar-cg",
    name: "Dainik Bhaskar — Chhattisgarh",
    category: "local",
    language: "hi",
    region: "cg",
    url: "https://www.bhaskar.com/rss-v1--category-446.xml",
    priority: 100,
  },
  {
    id: "bhaskar-raipur",
    name: "Dainik Bhaskar — Raipur",
    category: "local",
    language: "hi",
    region: "cg",
    url: "https://www.bhaskar.com/rss-feed/raipur",
    priority: 98,
  },
  {
    id: "patrika-cg",
    name: "Patrika — Chhattisgarh",
    category: "local",
    language: "hi",
    region: "cg",
    url: "https://www.patrika.com/rss/chhattisgarh-news.xml",
    priority: 96,
  },
  {
    id: "haribhoomi-cg",
    name: "Haribhoomi — Chhattisgarh",
    category: "local",
    language: "hi",
    region: "cg",
    url: "https://www.haribhoomi.com/chhattisgarh/feed/",
    priority: 94,
  },
  {
    id: "naidunia-cg",
    name: "Nai Dunia — Chhattisgarh",
    category: "local",
    language: "hi",
    region: "cg",
    url: "https://www.naidunia.com/rss/chhattisgarh",
    priority: 92,
  },
  {
    id: "naidunia-mpcg",
    name: "Nai Dunia — MP/CG",
    category: "local",
    language: "hi",
    region: "cg",
    url: "https://www.naidunia.com/rss/madhya-pradesh-chhattisgarh",
    priority: 90,
  },
  {
    id: "jagran-cg",
    name: "Jagran — Chhattisgarh",
    category: "local",
    language: "hi",
    region: "cg",
    url: "https://www.jagran.com/rss/location/chhattisgarh.xml",
    priority: 88,
  },
  {
    id: "etv-cg",
    name: "ETV Bharat — Chhattisgarh",
    category: "local",
    language: "hi",
    region: "cg",
    url: "https://hindi.etvbharat.com/state/chhattisgarh/rss",
    priority: 86,
  },
  {
    id: "zee-mpcg",
    name: "Zee News — MP/CG",
    category: "local",
    language: "hi",
    region: "cg",
    url: "https://zeenews.india.com/rss/india/madhya-pradesh-chhattisgarh-news.xml",
    priority: 84,
  },
  {
    id: "ndtv-mpcg",
    name: "NDTV — MP/CG",
    category: "local",
    language: "hi",
    region: "cg",
    url: "https://feeds.feedburner.com/ndtvnews-mp-chhattisgarh-news",
    priority: 82,
  },
  {
    id: "pib-raipur",
    name: "PIB — Raipur / Chhattisgarh",
    category: "local",
    language: "hi",
    region: "cg",
    url: "https://pib.gov.in/RssMain.aspx?RegID=22",
    priority: 80,
  },
  {
    id: "prabhat-cg",
    name: "Prabhat Khabar — Chhattisgarh",
    category: "local",
    language: "hi",
    region: "cg",
    url: "https://www.prabhatkhabar.com/state/chhattisgarh/feed",
    priority: 78,
  },
  // ── Hindi national context (lower priority, still CG-relevant) ──
  {
    id: "bhaskar-national",
    name: "Dainik Bhaskar — National",
    category: "politics",
    language: "hi",
    region: "india",
    url: "https://www.bhaskar.com/rss-v1--category-1.xml",
    priority: 40,
  },
];

export const RSS_FEED_TIMEOUT_MS = 12_000;
export const RSS_MAX_CONSECUTIVE_FAILURES = 3;
export const RSS_DISABLE_HOURS = 24;
export const RSS_MAX_ARTICLE_AGE_DAYS = 7;
export const RSS_PARALLEL_BATCH = 4;

export function regionToDbRegion(region: RSSSource["region"]): "chhattisgarh" | "india" | "global" {
  if (region === "cg") return "chhattisgarh";
  if (region === "global") return "global";
  return "india";
}
