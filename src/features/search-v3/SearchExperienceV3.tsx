"use client";

import { useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search as SearchInput } from "@/design-system/components/Search";
import { useLanguage } from "@/providers/LanguageProvider";
import { addSearchHistory } from "@/lib/search/history";
import type { HomeSectionId } from "@/lib/homepage/types";
import type { SearchTimeScope } from "@/lib/search/types";
import { buildSearchUrl } from "./core/api";
import { useSearchState } from "./core/SearchState";
import { FilterChips } from "./components/FilterChips";
import { VoiceSearchPlaceholder } from "./components/VoiceSearchPlaceholder";
import { SearchHome } from "./components/SearchHome";
import { SearchResults } from "./components/SearchResults";
import { SearchLoading } from "./components/SearchLoading";
import { SearchError } from "./components/SearchError";
import { SearchEmpty } from "./components/SearchEmpty";
import "./styles/search-v3.css";

export type SearchExperienceV3Props = {
  initialQuery?: string;
  initialDistrict?: string | null;
  initialCategory?: HomeSectionId | null;
  initialTime?: SearchTimeScope;
  compact?: boolean;
  autoFocus?: boolean;
  suppressResults?: boolean;
  onNavigate?: () => void;
};

/**
 * JDP-008 — Global Search Experience V3
 *
 * Presentation layer over existing GET /api/search — no API changes.
 */
export function SearchExperienceV3({
  initialQuery = "",
  initialDistrict = null,
  initialCategory = null,
  initialTime = "all",
  compact = false,
  autoFocus = false,
  suppressResults = false,
  onNavigate,
}: SearchExperienceV3Props) {
  const router = useRouter();
  const { t } = useLanguage();
  const inputRef = useRef<HTMLInputElement>(null);

  const search = useSearchState({
    initialQuery,
    initialDistrict,
    initialCategory,
    initialTime,
    compact,
    enabled: !suppressResults,
  });

  useEffect(() => {
    if (!autoFocus) return;
    const id = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(id);
  }, [autoFocus]);

  const openFullSearch = useCallback(() => {
    const url = buildSearchUrl({
      query: search.query,
      district: search.district,
      category: search.category,
      timeScope: search.timeScope,
    });
    if (search.query.trim()) addSearchHistory(search.query.trim());
    onNavigate?.();
    router.push(url);
  }, [search, onNavigate, router]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (search.query.trim()) addSearchHistory(search.query.trim());
    openFullSearch();
  };

  const handleQuerySelect = (term: string) => {
    search.setQuery(term);
    if (term.trim()) addSearchHistory(term.trim());
  };

  const isIdle =
    !search.query.trim() &&
    !search.district &&
    !search.category &&
    search.timeScope === "all";

  const showResults =
    !suppressResults &&
    search.result &&
    search.result.hits.length > 0 &&
    !search.loading;

  const showEmpty =
    !suppressResults &&
    search.result &&
    !search.loading &&
    (search.query.trim() || search.hasActiveSearch) &&
    search.result.hits.length === 0;

  const showHome =
    !suppressResults &&
    !search.loading &&
    !search.error &&
    isIdle &&
    !showResults;

  const trending = search.result?.trending ?? [];

  return (
    <div
      className={compact ? "search-v3 search-v3--compact" : "search-v3"}
      data-testid="search-v3"
    >
      <form className="search-v3__form" onSubmit={handleSubmit} role="search">
        <div className="search-v3__bar">
          <SearchInput
            ref={inputRef}
            value={search.query}
            onChange={(e) => search.setQuery(e.target.value)}
            onClear={() => {
              search.clearQuery();
              inputRef.current?.focus();
            }}
            placeholder={t.search.placeholder}
            aria-label={t.search.title}
            autoComplete="off"
            enterKeyHint="search"
            inputMode="search"
            autoCorrect="off"
            role="combobox"
            aria-expanded={Boolean(showResults || showHome)}
            aria-controls="search-v3-panel"
            className="search-v3__input"
          />
          <VoiceSearchPlaceholder />
        </div>

        <FilterChips
          district={search.district}
          category={search.category}
          timeScope={search.timeScope}
          onDistrictChange={search.setDistrict}
          onCategoryChange={search.setCategory}
          onTimeChange={search.setTimeScope}
        />

        {compact ? (
          <button
            type="button"
            className="search-v3__see-all tap-target"
            onClick={openFullSearch}
          >
            {t.search.seeAllResults ?? "See all results →"}
          </button>
        ) : null}
      </form>

      <div id="search-v3-panel" className="search-v3__panel">
        {search.loading ? <SearchLoading /> : null}

        {search.error ? (
          <SearchError message={search.error} onRetry={search.refresh} />
        ) : null}

        {showHome ? (
          <SearchHome
            trending={trending}
            selectedDistrict={search.district}
            onQuerySelect={handleQuerySelect}
            onDistrictSelect={search.setDistrict}
            onTopicSelect={handleQuerySelect}
          />
        ) : null}

        {showResults && search.result ? (
          <SearchResults
            hits={search.result.hits}
            total={search.result.total}
            tookMs={search.result.tookMs}
            districtLabel={search.result.parsed.district}
            compact={compact}
            onNavigate={onNavigate}
          />
        ) : null}

        {showEmpty ? (
          <SearchEmpty
            query={search.query}
            trending={trending}
            onTrendingSelect={handleQuerySelect}
            onTopicSelect={handleQuerySelect}
          />
        ) : null}
      </div>
    </div>
  );
}
