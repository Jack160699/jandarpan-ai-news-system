/**
 * Module 1 — Keyword Tracker
 * Default groups + custom keyword support via serp_keywords table.
 */

export const DEFAULT_KEYWORD_GROUPS: Record<string, string[]> = {
  "India News": [
    "भारत समाचार",
    "देश की ताज़ा खबरें",
    "India news",
    "breaking news Hindi",
  ],
  Politics: ["भारत राजनीति", "India politics", "संसद", "सरकार की योजना"],
  Economy: ["भारतीय अर्थव्यवस्था", "economy news India", "GDP India", "महंगाई"],
  Crime: ["अपराध समाचार", "India crime news"],
  Weather: ["मौसम अपडेट", "India weather forecast", "मानसून"],
  "Government Schemes": ["सरकारी योजना", "central government schemes", "पीएम योजना"],
  Education: ["शिक्षा समाचार", "CBSE result", "board exam", "UPSC"],
  Jobs: ["सरकारी नौकरी", "Sarkari naukri", "India jobs vacancy"],
  Sports: ["खेल समाचार", "cricket news", "IPL", "Team India"],
  Business: ["शेयर बाजार", "Stock market India", "Sensex", "Nifty", "व्यापार समाचार"],
  Technology: ["तकनीक समाचार", "tech news Hindi", "AI news", "smartphone launch"],
  Entertainment: ["बॉलीवुड समाचार", "Bollywood news Hindi", "मनोरंजन"],
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
