export { isSearchV3Enabled } from "./config";
export { SearchExperienceV3 } from "./SearchExperienceV3";
export type { SearchExperienceV3Props } from "./SearchExperienceV3";
export { SearchOverlayV3 } from "./SearchOverlayV3";
export { SearchResults } from "./components/SearchResults";

export {
  SearchOverlay,
  SearchProvider,
  useSearchContext,
  useOptionalSearchContext,
  useSearchState,
  useSearchHistory,
  useSearchKeyboard,
  buildSearchCommandItems,
  buildSearchUrl,
  fetchSearch,
  SEARCH_QUICK_DISTRICTS,
  SEARCH_FILTER_CATEGORIES,
  SEARCH_V3_DISTRICTS,
  SEARCH_V3_CATEGORIES,
  SEARCH_V3_TOPICS,
} from "./core";
export type {
  SearchOverlayProps,
  SearchOverlayVariant,
  SearchProviderProps,
  UseSearchStateOptions,
  UseSearchStateReturn,
} from "./core";

/** @deprecated Use useSearchState from @/features/search-v3/core */
export { useSearchV3 } from "./hooks/useSearchV3";
