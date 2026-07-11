"use client";

import { useSearchState, type UseSearchStateOptions, type UseSearchStateReturn } from "../core/SearchState";

export type UseSearchV3Options = UseSearchStateOptions;
export type UseSearchV3Return = UseSearchStateReturn;

/** @deprecated Import useSearchState from @/features/search-v3/core instead. */
export function useSearchV3(options: UseSearchV3Options = {}): UseSearchV3Return {
  return useSearchState(options);
}
