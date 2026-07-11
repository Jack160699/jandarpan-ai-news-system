"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Skeleton, SkeletonText } from "@/components/ui/Skeleton";
import { SearchHitCard } from "@/components/search/SearchHitCard";
import { SearchDismissLink } from "@/components/search/SearchDismissLink";
import { useLanguage } from "@/providers/LanguageProvider";
import { addSearchHistory } from "@/lib/search/history";
import type { HomeSectionId } from "@/lib/homepage/types";
import type { SearchTimeScope } from "@/lib/search/types";
import { buildSearchUrl } from "@/features/search-v3/core/api";
import { useSearchState } from "@/features/search-v3/core/SearchState";
import { useSearchHistory } from "@/features/search-v3/core/SearchHistory";
import {
  LEGACY_FILTER_CATEGORIES,
  LEGACY_FILTER_DISTRICTS,
} from "@/features/search-v3/core/SearchFilters";

type SearchPanelProps = {
  initialQuery?: string;
  initialDistrict?: string | null;
  initialCategory?: HomeSectionId | null;
  initialTime?: SearchTimeScope;
  compact?: boolean;
  autoFocus?: boolean;
  suppressResults?: boolean;
  onNavigate?: () => void;
};

function SearchIcon() {
  return (
    <span className="search-form__icon" aria-hidden>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="11" cy="11" r="7" />
        <path d="M20 20l-3.5-3.5" strokeLinecap="round" />
      </svg>
    </span>
  );
}

export function SearchPanel({
  initialQuery = "",
  initialDistrict = null,
  initialCategory = null,
  initialTime = "all",
  compact = false,
  autoFocus = false,
  suppressResults = false,
  onNavigate,
}: SearchPanelProps) {
  const router = useRouter();
  const { t } = useLanguage();
  const inputRef = useRef<HTMLInputElement>(null);
  const { history, clear: clearHistory } = useSearchHistory();

  const search = useSearchState({
    initialQuery,
    initialDistrict,
    initialCategory,
    initialTime,
    compact,
    enabled: !suppressResults,
    skipIdleFetch: true,
  });

  useEffect(() => {
    if (!autoFocus) return;
    const id = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(id);
  }, [autoFocus]);

  const openFullSearch = () => {
    const url = buildSearchUrl({
      query: search.query,
      district: search.district,
      category: search.category,
      timeScope: search.timeScope,
    });
    if (search.query.trim()) addSearchHistory(search.query.trim());
    onNavigate?.();
    router.push(url);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (search.query.trim()) addSearchHistory(search.query.trim());
    openFullSearch();
  };

  const onHistorySelect = (term: string) => {
    search.setQuery(term);
    if (!compact) {
      addSearchHistory(term);
    }
  };

  return (
    <div className={compact ? "search-panel--compact" : "search-page"}>
      <form className="search-form" onSubmit={handleSubmit}>
        <div className="search-form__field search-form__field--premium">
          <SearchIcon />
          <input
            ref={inputRef}
            type="search"
            className="search-form__input search-form__input--premium"
            value={search.query}
            onChange={(e) => search.setQuery(e.target.value)}
            placeholder={t.search.placeholder}
            aria-label={t.search.title}
            autoComplete="off"
            enterKeyHint="search"
            inputMode="search"
            autoCorrect="off"
            role="combobox"
            aria-expanded={Boolean(search.result?.hits.length)}
            aria-controls="search-results-list"
          />
          {search.query ? (
            <button
              type="button"
              className="search-form__clear search-form__clear--premium tap-target"
              onClick={() => {
                search.clearQuery();
                inputRef.current?.focus();
              }}
              aria-label={t.search.clearHistory}
            >
              ×
            </button>
          ) : null}
        </div>

        <div
          className="search-filters search-filters--premium"
          role="group"
          aria-label="Filters"
        >
          {LEGACY_FILTER_DISTRICTS.map((d) => (
            <button
              key={d.id}
              type="button"
              className={`search-chip search-chip--premium tap-target ${search.district === d.id ? "search-chip--active" : ""}`}
              aria-pressed={search.district === d.id}
              onClick={() =>
                search.setDistrict(search.district === d.id ? null : d.id)
              }
            >
              {d.label}
            </button>
          ))}
          {LEGACY_FILTER_CATEGORIES.map((c) => (
            <button
              key={c.id}
              type="button"
              className={`search-chip search-chip--premium tap-target ${search.category === c.id ? "search-chip--active" : ""}`}
              aria-pressed={search.category === c.id}
              onClick={() =>
                search.setCategory(search.category === c.id ? null : c.id)
              }
            >
              {c.label}
            </button>
          ))}
          <button
            type="button"
            className={`search-chip search-chip--premium tap-target ${search.timeScope === "today" ? "search-chip--active" : ""}`}
            aria-pressed={search.timeScope === "today"}
            onClick={() =>
              search.setTimeScope(search.timeScope === "today" ? "all" : "today")
            }
          >
            {t.common.today}
          </button>
        </div>

        {compact ? (
          <button
            type="button"
            className="search-overlay__see-all tap-target"
            onClick={openFullSearch}
          >
            {t.search.seeAllResults}
          </button>
        ) : null}
      </form>

      {history.length > 0 && !search.query && !search.loading ? (
        <div className="search-history search-history--premium">
          <div className="search-history__head">
            <p className="search-history__label">{t.search.recentSearches}</p>
            <button
              type="button"
              className="search-history__clear search-history__clear--premium tap-target"
              onClick={clearHistory}
            >
              {t.search.clearHistory}
            </button>
          </div>
          <ul className="search-chip-list" role="list">
            {history.map((term) => (
              <li key={term}>
                <button
                  type="button"
                  className="search-chip-link tap-target"
                  onClick={() => onHistorySelect(term)}
                >
                  {term}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {search.loading ? (
        <div
          className="search-loading search-loading--premium"
          aria-live="polite"
          aria-busy="true"
        >
          <p className="search-loading__label">{t.search.searching}</p>
          <div className="search-loading__rows">
            {[1, 2, 3].map((i) => (
              <div key={i} className="search-loading__row">
                <Skeleton className="h-14 w-14 shrink-0 rounded-lg" />
                <SkeletonText lines={2} className="flex-1" />
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {search.error ? (
        <p className="search-empty search-empty--premium" role="alert">
          {search.error}
        </p>
      ) : null}

      {!suppressResults &&
      search.result?.trending?.length &&
      !search.result.hits.length &&
      !search.query ? (
        <section
          className="search-trending"
          aria-labelledby="search-overlay-trending-title"
        >
          <header className="search-section-header">
            <h2
              id="search-overlay-trending-title"
              className="search-section-header__title"
            >
              {t.home.trending}
            </h2>
            <p className="search-section-header__subtitle">{t.search.hint}</p>
          </header>
          <ul className="search-chip-list" role="list">
            {search.result.trending.map((term) => (
              <li key={term}>
                <SearchDismissLink
                  href={`/search?q=${encodeURIComponent(term)}`}
                  className="search-chip-link tap-target"
                  onDismiss={onNavigate}
                >
                  {term}
                </SearchDismissLink>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {!suppressResults && search.result && search.result.hits.length > 0 ? (
        <div
          className={
            compact
              ? "search-overlay-results search-overlay-results--premium"
              : ""
          }
        >
          <p
            className="search-meta search-meta--premium"
            aria-live="polite"
            aria-atomic="true"
          >
            <span className="search-meta__count">{search.result.total}</span>{" "}
            {search.result.total === 1 ? "result" : "results"}
            {search.result.parsed.district ? ` · ${search.result.parsed.district}` : ""}
            {search.result.tookMs ? ` · ${search.result.tookMs}ms` : ""}
          </p>
          <ul
            className="search-results search-results--premium"
            id="search-results-list"
            role="listbox"
          >
            {search.result.hits.map((hit, index) => (
              <SearchHitCard
                key={hit.id}
                hit={hit}
                onNavigate={onNavigate}
                priority={index < 2}
              />
            ))}
          </ul>
        </div>
      ) : null}

      {!suppressResults &&
      search.result &&
      !search.loading &&
      search.query &&
      search.result.hits.length === 0 ? (
        <p className="search-empty search-empty--premium">{t.search.noResults}</p>
      ) : null}
    </div>
  );
}
