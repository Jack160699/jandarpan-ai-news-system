/**
 * Module 1 — Keyword Tracker
 * Default groups + custom keyword support via serp_keywords table.
 */

export const DEFAULT_KEYWORD_GROUPS: Record<string, string[]> = {
  "Chhattisgarh News": [
    "छत्तीसगढ़ समाचार",
    "छत्तीसगढ़ न्यूज़",
    "Chhattisgarh news",
  ],
  "Raipur News": ["रायपुर समाचार", "Raipur news"],
  "Korba News": ["कोरबा समाचार", "Korba news"],
  "Bilaspur News": ["बिलासपुर समाचार", "Bilaspur news"],
  "Bastar News": ["बस्तर समाचार", "Bastar news"],
  "Kanker News": ["कांकेर समाचार", "Kanker news"],
  "Durg News": ["दुर्ग समाचार", "Durg news"],
  Politics: ["छत्तीसगढ़ राजनीति", "Chhattisgarh politics"],
  Crime: ["छत्तीसगढ़ अपराध", "Chhattisgarh crime"],
  Weather: ["छत्तीसगढ़ मौसम", "Chhattisgarh weather"],
  "Government Schemes": ["सरकारी योजना छत्तीसगढ़"],
  Education: ["छत्तीसगढ़ शिक्षा", "Chhattisgarh education"],
  Jobs: ["छत्तीसगढ़ नौकरी", "Chhattisgarh jobs"],
  Sports: ["छत्तीसगढ़ खेल", "Chhattisgarh sports"],
  Business: ["छत्तीसगढ़ व्यापार", "Chhattisgarh business"],
  Technology: ["छत्तीसगढ़ तकनीक", "Chhattisgarh technology"],
  Entertainment: ["बॉलीवुड समाचार", "Bollywood news Hindi"],
};

export function normalizeKeyword(keyword: string): string {
  return keyword.trim().replace(/\s+/g, " ");
}

export function isValidKeyword(keyword: string): boolean {
  const normalized = normalizeKeyword(keyword);
  return normalized.length >= 2 && normalized.length <= 200;
}

export function groupKeywordsByCategory(
  keywords: Array<{ keyword: string; group_name: string }>
): Record<string, string[]> {
  const groups: Record<string, string[]> = {};
  for (const row of keywords) {
    if (!groups[row.group_name]) groups[row.group_name] = [];
    groups[row.group_name].push(row.keyword);
  }
  return groups;
}
