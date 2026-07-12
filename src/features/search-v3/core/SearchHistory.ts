"use client";

import { useCallback, useState } from "react";
import {
  addSearchHistory as persistSearchHistory,
  clearSearchHistory as persistClearSearchHistory,
  getSearchHistory,
} from "@/lib/search/history";

export const SEARCH_HISTORY_RECENT_LIMIT = 5;

/** Shared hook for reading/writing local search history. */
export function useSearchHistory() {
  const [history, setHistory] = useState<string[]>(() =>
    typeof window !== "undefined" ? getSearchHistory() : []
  );

  const refresh = useCallback(() => {
    setHistory(getSearchHistory());
  }, []);

  const add = useCallback(
    (term: string) => {
      persistSearchHistory(term);
      refresh();
    },
    [refresh]
  );

  const clear = useCallback(() => {
    persistClearSearchHistory();
    setHistory([]);
  }, []);

  const recent = history.slice(0, SEARCH_HISTORY_RECENT_LIMIT);

  return {
    history,
    recent,
    refresh,
    add,
    clear,
  };
}
