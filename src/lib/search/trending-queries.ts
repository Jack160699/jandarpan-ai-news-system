/**
 * Trending search suggestions — regional news intents
 */

export const DEFAULT_TRENDING_SEARCHES = [
  "Raipur news today",
  "Chhattisgarh politics latest",
  "farmer news in Chhattisgarh",
  "Bastar update",
  "CG business news",
  "Bilaspur crime",
  "छत्तीसगढ़ समाचार आज",
  "रायपुर खबर",
  "latest CG politics",
  "Durg Bhilai news",
] as const;

export function getTrendingSearches(limit = 8): string[] {
  return DEFAULT_TRENDING_SEARCHES.slice(0, limit);
}

export function rankTrendingForQuery(
  query: string,
  pool: string[] = [...DEFAULT_TRENDING_SEARCHES]
): string[] {
  if (!query.trim()) return getTrendingSearches();

  const q = query.toLowerCase();
  return [...pool]
    .sort((a, b) => {
      const aMatch = a.toLowerCase().includes(q) ? 1 : 0;
      const bMatch = b.toLowerCase().includes(q) ? 1 : 0;
      return bMatch - aMatch;
    })
    .slice(0, 8);
}
