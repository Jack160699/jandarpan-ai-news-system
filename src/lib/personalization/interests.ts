/** Feed interest chips — drives homepage ranking hints via interest-sections map */

export type FeedInterest = {
  id: string;
  labelEn: string;
  labelHi: string;
};

export const FEED_INTERESTS: FeedInterest[] = [
  { id: "cg-news", labelEn: "Chhattisgarh", labelHi: "छत्तीसगढ़" },
  { id: "national", labelEn: "National", labelHi: "राष्ट्रीय" },
  { id: "international", labelEn: "International", labelHi: "अंतर्राष्ट्रीय" },
  { id: "politics", labelEn: "Politics", labelHi: "राजनीति" },
  { id: "sports", labelEn: "Sports", labelHi: "खेल" },
  { id: "business", labelEn: "Business", labelHi: "व्यापार" },
  { id: "technology", labelEn: "Technology", labelHi: "तकनीक" },
  { id: "entertainment", labelEn: "Entertainment", labelHi: "मनोरंजन" },
  { id: "education", labelEn: "Education", labelHi: "शिक्षा" },
  { id: "crime", labelEn: "Crime", labelHi: "अपराध" },
  { id: "health", labelEn: "Health", labelHi: "स्वास्थ्य" },
  { id: "jobs", labelEn: "Jobs", labelHi: "नौकरी" },
  { id: "raipur", labelEn: "Raipur", labelHi: "रायपुर" },
];

export const DEFAULT_FEED_INTERESTS = ["cg-news", "politics", "business"];

export const FEED_INTEREST_IDS = new Set(FEED_INTERESTS.map((i) => i.id));

export function isValidFeedInterest(id: string): boolean {
  return FEED_INTEREST_IDS.has(id);
}

export function normalizeFeedInterests(ids: string[] | undefined): string[] {
  if (!ids?.length) return [...DEFAULT_FEED_INTERESTS];
  const out = ids.filter(isValidFeedInterest).slice(0, 12);
  return out.length ? out : [...DEFAULT_FEED_INTERESTS];
}
