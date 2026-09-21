/**
 * Trending search suggestions — regional news intents
 */

export const DEFAULT_TRENDING_SEARCHES = [
  "India news today",
  "Breaking news India",
  "Stock market live",
  "Sarkari naukri updates",
  "Weather forecast India",
  "Tech news Hindi",
  "भारत समाचार आज",
  "देश की बड़ी खबरें",
  "सरकारी योजना अपडेट",
  "Gold silver price today",
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
