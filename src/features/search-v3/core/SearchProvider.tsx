"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { HomeSectionId } from "@/lib/homepage/types";
import type { SearchTimeScope } from "@/lib/search/types";
import { addSearchHistory } from "@/lib/search/history";
import { buildSearchUrl } from "./api";
import {
  useSearchState,
  type UseSearchStateOptions,
  type UseSearchStateReturn,
} from "./SearchState";

export type SearchProviderProps = UseSearchStateOptions & {
  children: ReactNode;
  onNavigate?: () => void;
};

type SearchContextValue = UseSearchStateReturn & {
  openFullSearch: () => string;
  recordQuery: (term: string) => void;
  onNavigate?: () => void;
};

const SearchContext = createContext<SearchContextValue | null>(null);

/** Provides shared search state to overlay, page, and command surfaces. */
export function SearchProvider({
  children,
  onNavigate,
  ...options
}: SearchProviderProps) {
  const search = useSearchState(options);

  const value = useMemo<SearchContextValue>(() => {
    const openFullSearch = () => {
      const url = buildSearchUrl({
        query: search.query,
        district: search.district,
        category: search.category,
        timeScope: search.timeScope,
      });
      if (search.query.trim()) addSearchHistory(search.query.trim());
      onNavigate?.();
      return url;
    };

    const recordQuery = (term: string) => {
      if (term.trim()) addSearchHistory(term.trim());
    };

    return {
      ...search,
      openFullSearch,
      recordQuery,
      onNavigate,
    };
  }, [search, onNavigate]);

  return (
    <SearchContext.Provider value={value}>{children}</SearchContext.Provider>
  );
}

export function useSearchContext(): SearchContextValue {
  const ctx = useContext(SearchContext);
  if (!ctx) {
    throw new Error("useSearchContext must be used within SearchProvider");
  }
  return ctx;
}

export function useOptionalSearchContext(): SearchContextValue | null {
  return useContext(SearchContext);
}

export type { HomeSectionId, SearchTimeScope };
