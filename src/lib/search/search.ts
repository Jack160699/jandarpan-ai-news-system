/**
 * Smart multilingual news search — orchestration
 */

import { unstable_cache } from "next/cache";
import { fetchGeneratedArticlePool } from "@/lib/newsroom/generated/read";
import { logNewsroom } from "@/lib/newsroom/logger";
import { buildSearchIndex, searchIndex, type SearchIndex } from "@/lib/search/indexer";
import { getTrendingSearches, rankTrendingForQuery } from "@/lib/search/trending-queries";
import type { SearchFilters, SearchResult } from "@/lib/search/types";

const INDEX_CACHE_TAG = "news-search-index";

async function loadSearchIndexUncached(): Promise<SearchIndex> {
  const rows = await fetchGeneratedArticlePool(200);
  return buildSearchIndex(rows);
}

export const getSearchIndex = unstable_cache(
  loadSearchIndexUncached,
  ["news-search-index-v1"],
  { revalidate: 120, tags: [INDEX_CACHE_TAG] }
);

export async function executeSearch(
  query: string,
  filters: SearchFilters = {}
): Promise<SearchResult> {
  const started = Date.now();
  const index = await getSearchIndex();
  const { hits, parsed } = searchIndex(index, query, filters);

  const result: SearchResult = {
    query: query.trim(),
    parsed,
    hits,
    total: hits.length,
    trending: rankTrendingForQuery(query),
    tookMs: Date.now() - started,
  };

  logNewsroom("search", "query_complete", {
    q: query.slice(0, 80),
    hits: hits.length,
    district: parsed.district,
    category: parsed.category,
    timeScope: parsed.timeScope,
    tookMs: result.tookMs,
    indexSize: index.documents.length,
  });

  return result;
}

export { INDEX_CACHE_TAG };
