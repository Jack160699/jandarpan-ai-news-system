/**
 * Smart multilingual news search — orchestration
 */

import { unstable_cache } from "next/cache";
import { getServerReaderLanguage } from "@/lib/i18n/server-language";
import { getTrendingSearchesForLanguage } from "@/lib/i18n/trending-searches";
import type { NewsroomLanguage } from "@/lib/i18n/languages";
import { fetchGeneratedArticlePool } from "@/lib/newsroom/generated/read";
import { logNewsroom } from "@/lib/newsroom/logger";
import {
  buildSearchIndex,
  restoreSearchIndex,
  searchIndex,
  snapshotSearchIndex,
  type SearchIndexSnapshot,
} from "@/lib/search/indexer";
import { rankTrendingForQuery } from "@/lib/search/trending-queries";
import type { SearchFilters, SearchResult } from "@/lib/search/types";

const INDEX_CACHE_TAG = "news-search-index";

async function loadSearchIndexUncached(
  displayLanguage: NewsroomLanguage
): Promise<SearchIndexSnapshot> {
  const rows = await fetchGeneratedArticlePool(200, { select: "homepage" });
  return snapshotSearchIndex(buildSearchIndex(rows, displayLanguage));
}

/** ISR cache key: news-search-index-v4 + displayLanguage (hi | en) */
export function getSearchIndexCacheKey(displayLanguage: NewsroomLanguage): string {
  return `news-search-index-v4:${displayLanguage}`;
}

export async function getSearchIndex(displayLanguage: NewsroomLanguage) {
  const cached = unstable_cache(
    () => loadSearchIndexUncached(displayLanguage),
    ["news-search-index-v4", displayLanguage],
    {
      revalidate: 120,
      tags: [INDEX_CACHE_TAG, `${INDEX_CACHE_TAG}:${displayLanguage}`],
    }
  );
  return restoreSearchIndex(await cached());
}

export async function executeSearch(
  query: string,
  filters: SearchFilters = {},
  displayLanguage?: NewsroomLanguage
): Promise<SearchResult> {
  const started = Date.now();
  const lang = displayLanguage ?? (await getServerReaderLanguage());
  const index = await getSearchIndex(lang);
  const { hits, parsed } = searchIndex(index, query, filters);
  const trendingPool = getTrendingSearchesForLanguage(lang, 10);

  const result: SearchResult = {
    query: query.trim(),
    parsed,
    hits,
    total: hits.length,
    trending: rankTrendingForQuery(query, trendingPool),
    tookMs: Date.now() - started,
  };

  logNewsroom("search", "query_complete", {
    q: query.slice(0, 80),
    hits: hits.length,
    district: parsed.district,
    category: parsed.category,
    timeScope: parsed.timeScope,
    displayLanguage: lang,
    tookMs: result.tookMs,
    indexSize: index.documents.length,
  });

  return result;
}

export { INDEX_CACHE_TAG };
