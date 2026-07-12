"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { HomeSectionId } from "@/lib/homepage/types";
import type { SearchResult, SearchTimeScope } from "@/lib/search/types";
import {
  SEARCH_DEBOUNCE_MS,
  fetchSearch,
  hasActiveSearchParams,
} from "./api";

export type UseSearchStateOptions = {
  initialQuery?: string;
  initialDistrict?: string | null;
  initialCategory?: HomeSectionId | null;
  initialTime?: SearchTimeScope;
  compact?: boolean;
  enabled?: boolean;
  /** Legacy SearchPanel skips API when idle; V3 always fetches for trending home. */
  skipIdleFetch?: boolean;
};

export type UseSearchStateReturn = {
  query: string;
  setQuery: (value: string) => void;
  district: string | null;
  setDistrict: (value: string | null) => void;
  category: HomeSectionId | null;
  setCategory: (value: HomeSectionId | null) => void;
  timeScope: SearchTimeScope;
  setTimeScope: (value: SearchTimeScope) => void;
  result: SearchResult | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
  clearQuery: () => void;
  hasActiveSearch: boolean;
};

export function useSearchState({
  initialQuery = "",
  initialDistrict = null,
  initialCategory = null,
  initialTime = "all",
  compact = false,
  enabled = true,
  skipIdleFetch = false,
}: UseSearchStateOptions = {}): UseSearchStateReturn {
  const [query, setQuery] = useState(initialQuery);
  const [district, setDistrict] = useState<string | null>(initialDistrict);
  const [category, setCategory] = useState<HomeSectionId | null>(initialCategory);
  const [timeScope, setTimeScope] = useState<SearchTimeScope>(initialTime);
  const [result, setResult] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const hasActiveSearch = hasActiveSearchParams({
    query,
    district,
    category,
    timeScope,
  });

  const runSearch = useCallback(async () => {
    if (!enabled) return;

    if (
      skipIdleFetch &&
      !hasActiveSearchParams({ query, district, category, timeScope })
    ) {
      setResult(null);
      setError(null);
      setLoading(false);
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);

    try {
      const json = await fetchSearch(
        {
          query,
          district,
          category,
          timeScope,
          limit: compact ? 6 : 15,
        },
        controller.signal
      );

      if (!controller.signal.aborted) {
        setResult(json);
      }
    } catch (err) {
      if (controller.signal.aborted) return;
      setResult(null);
      setError(
        err instanceof Error && err.message.includes("unavailable")
          ? err.message
          : "Search unavailable. Check your connection."
      );
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, [query, district, category, timeScope, compact, enabled, skipIdleFetch]);

  useEffect(() => {
    if (!enabled) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(runSearch, SEARCH_DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, district, category, timeScope, runSearch, enabled]);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  const clearQuery = useCallback(() => {
    setQuery("");
    setError(null);
    if (skipIdleFetch) {
      setResult(null);
    }
  }, [skipIdleFetch]);

  return {
    query,
    setQuery,
    district,
    setDistrict,
    category,
    setCategory,
    timeScope,
    setTimeScope,
    result,
    loading,
    error,
    refresh: runSearch,
    clearQuery,
    hasActiveSearch,
  };
}
