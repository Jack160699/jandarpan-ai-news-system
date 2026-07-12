import type { HomeSectionId } from "@/lib/homepage/types";
import type { SearchResult, SearchTimeScope } from "@/lib/search/types";

export const SEARCH_DEBOUNCE_MS = 280;

export type SearchQueryParams = {
  query: string;
  district?: string | null;
  category?: HomeSectionId | null;
  timeScope?: SearchTimeScope;
  limit?: number;
};

/** Build URLSearchParams for GET /api/search — no API changes. */
export function buildSearchParams({
  query,
  district,
  category,
  timeScope = "all",
  limit = 15,
}: SearchQueryParams): URLSearchParams {
  const params = new URLSearchParams();
  if (query.trim()) params.set("q", query.trim());
  if (district) params.set("district", district);
  if (category) params.set("category", category);
  if (timeScope !== "all") params.set("time", timeScope);
  params.set("limit", String(limit));
  return params;
}

export function buildSearchUrl(params: SearchQueryParams): string {
  return `/search?${buildSearchParams(params).toString()}`;
}

export function hasActiveSearchParams({
  query,
  district,
  category,
  timeScope = "all",
}: Pick<SearchQueryParams, "query" | "district" | "category" | "timeScope">): boolean {
  return Boolean(query.trim() || district || category || timeScope !== "all");
}

/** Fetch search results from existing GET /api/search endpoint. */
export async function fetchSearch(
  params: SearchQueryParams,
  signal?: AbortSignal
): Promise<SearchResult> {
  const res = await fetch(`/api/search?${buildSearchParams(params).toString()}`, {
    signal,
  });
  const json = (await res.json()) as SearchResult & { ok?: boolean };

  if (json.ok === false) {
    throw new Error("Search unavailable. Try again.");
  }

  return json;
}
