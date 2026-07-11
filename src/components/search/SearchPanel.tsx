"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Skeleton, SkeletonText } from "@/components/ui/Skeleton";
import { SearchHitCard } from "@/components/search/SearchHitCard";
import { SearchDismissLink } from "@/components/search/SearchDismissLink";
import { useLanguage } from "@/providers/LanguageProvider";
import {
  addSearchHistory,
  clearSearchHistory,
  getSearchHistory,
} from "@/lib/search/history";
import type { SearchResult } from "@/lib/search/types";
import type { HomeSectionId } from "@/lib/homepage/types";
import type { SearchTimeScope } from "@/lib/search/types";

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

const DISTRICTS = [
  { id: "raipur", label: "Raipur" },
  { id: "bilaspur", label: "Bilaspur" },
  { id: "bastar", label: "Bastar" },
  { id: "chhattisgarh", label: "CG" },
] as const;

const CATEGORIES: { id: HomeSectionId; label: string }[] = [
  { id: "india", label: "Politics" },
  { id: "business", label: "Business" },
  { id: "sports", label: "Sports" },
  { id: "education", label: "Education" },
];

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
  const [query, setQuery] = useState(initialQuery);
  const [district, setDistrict] = useState<string | null>(initialDistrict);
  const [category, setCategory] = useState<HomeSectionId | null>(initialCategory);
  const [timeScope, setTimeScope] = useState<SearchTimeScope>(initialTime);
  const [result, setResult] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<string[]>(() =>
    typeof window !== "undefined" ? getSearchHistory() : []
  );
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!autoFocus) return;
    const id = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(id);
  }, [autoFocus]);

  const runSearch = useCallback(
    async (q: string) => {
      if (!q.trim() && !district && !category) {
        setResult(null);
        setError(null);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (q.trim()) params.set("q", q.trim());
        if (district) params.set("district", district);
        if (category) params.set("category", category);
        if (timeScope !== "all") params.set("time", timeScope);
        params.set("limit", compact ? "6" : "15");

        const res = await fetch(`/api/search?${params.toString()}`);
        const json = (await res.json()) as SearchResult & { ok?: boolean };
        if (json.ok !== false) {
          setResult(json);
        } else {
          setError("Search unavailable. Try again.");
        }
      } catch {
        setResult(null);
        setError("Search unavailable. Check your connection.");
      } finally {
        setLoading(false);
      }
    },
    [district, category, timeScope, compact]
  );

  useEffect(() => {
    if (suppressResults) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      runSearch(query);
    }, 280);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, district, category, timeScope, runSearch, suppressResults]);

  const openFullSearch = () => {
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (district) params.set("district", district);
    if (category) params.set("category", category);
    if (timeScope !== "all") params.set("time", timeScope);
    if (query.trim()) addSearchHistory(query.trim());
    onNavigate?.();
    router.push(`/search?${params.toString()}`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) addSearchHistory(query.trim());
    openFullSearch();
  };

  const clearQuery = () => {
    setQuery("");
    setResult(null);
    setError(null);
    inputRef.current?.focus();
  };

  const onHistorySelect = (term: string) => {
    setQuery(term);
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
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t.search.placeholder}
            aria-label={t.search.title}
            autoComplete="off"
            enterKeyHint="search"
            inputMode="search"
            autoCorrect="off"
            role="combobox"
            aria-expanded={Boolean(result?.hits.length)}
            aria-controls="search-results-list"
          />
          {query ? (
            <button
              type="button"
              className="search-form__clear search-form__clear--premium tap-target"
              onClick={clearQuery}
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
          {DISTRICTS.map((d) => (
            <button
              key={d.id}
              type="button"
              className={`search-chip search-chip--premium tap-target ${district === d.id ? "search-chip--active" : ""}`}
              aria-pressed={district === d.id}
              onClick={() =>
                setDistrict(district === d.id ? null : d.id)
              }
            >
              {d.label}
            </button>
          ))}
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              type="button"
              className={`search-chip search-chip--premium tap-target ${category === c.id ? "search-chip--active" : ""}`}
              aria-pressed={category === c.id}
              onClick={() =>
                setCategory(category === c.id ? null : c.id)
              }
            >
              {c.label}
            </button>
          ))}
          <button
            type="button"
            className={`search-chip search-chip--premium tap-target ${timeScope === "today" ? "search-chip--active" : ""}`}
            aria-pressed={timeScope === "today"}
            onClick={() =>
              setTimeScope(timeScope === "today" ? "all" : "today")
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

      {history.length > 0 && !query && !loading ? (
        <div className="search-history search-history--premium">
          <div className="search-history__head">
            <p className="search-history__label">{t.search.recentSearches}</p>
            <button
              type="button"
              className="search-history__clear search-history__clear--premium tap-target"
              onClick={() => {
                clearSearchHistory();
                setHistory([]);
              }}
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

      {loading ? (
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

      {error ? (
        <p className="search-empty search-empty--premium" role="alert">
          {error}
        </p>
      ) : null}

      {!suppressResults &&
      result?.trending?.length &&
      !result.hits.length &&
      !query ? (
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
            {result.trending.map((term) => (
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

      {!suppressResults && result && result.hits.length > 0 ? (
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
            <span className="search-meta__count">{result.total}</span>{" "}
            {result.total === 1 ? "result" : "results"}
            {result.parsed.district ? ` · ${result.parsed.district}` : ""}
            {result.tookMs ? ` · ${result.tookMs}ms` : ""}
          </p>
          <ul
            className="search-results search-results--premium"
            id="search-results-list"
            role="listbox"
          >
            {result.hits.map((hit, index) => (
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
      result &&
      !loading &&
      query &&
      result.hits.length === 0 ? (
        <p className="search-empty search-empty--premium">{t.search.noResults}</p>
      ) : null}
    </div>
  );
}
