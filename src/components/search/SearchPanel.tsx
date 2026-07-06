"use client";

import Link from "next/link";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Skeleton, SkeletonText } from "@/components/ui/Skeleton";
import { IMAGE_BLUR } from "@/lib/image-placeholder";
import { useLanguage } from "@/providers/LanguageProvider";
import {
  addSearchHistory,
  clearSearchHistory,
  getSearchHistory,
} from "@/lib/search/history";
import type { SearchHit, SearchResult } from "@/lib/search/types";
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
    <div className={compact ? "" : "search-page"}>
      <form className="search-form" onSubmit={handleSubmit}>
        <div className="search-form__field">
          <input
            ref={inputRef}
            type="search"
            className="search-form__input"
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
              className="search-form__clear tap-target"
              onClick={clearQuery}
              aria-label="Clear search"
            >
              ×
            </button>
          ) : null}
        </div>

        <div className="search-filters" role="group" aria-label="Filters">
          {DISTRICTS.map((d) => (
            <button
              key={d.id}
              type="button"
              className={`search-chip tap-target ${district === d.id ? "search-chip--active" : ""}`}
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
              className={`search-chip tap-target ${category === c.id ? "search-chip--active" : ""}`}
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
            className={`search-chip tap-target ${timeScope === "today" ? "search-chip--active" : ""}`}
            aria-pressed={timeScope === "today"}
            onClick={() =>
              setTimeScope(timeScope === "today" ? "all" : "today")
            }
          >
            Today
          </button>
        </div>

        {compact ? (
          <button
            type="button"
            className="meta-label mt-2 min-h-[44px] text-left text-[var(--accent-category)] tap-target"
            onClick={openFullSearch}
          >
            {t.search.seeAllResults ?? "See all results →"}
          </button>
        ) : null}
      </form>

      {history.length > 0 && !query && !loading ? (
        <div className="search-history">
          <div className="search-history__head">
            <p className="search-history__label">{t.search.recentSearches ?? "Recent searches"}</p>
            <button
              type="button"
              className="search-history__clear tap-target"
              onClick={() => {
                clearSearchHistory();
                setHistory([]);
              }}
            >
              Clear
            </button>
          </div>
          <ul className="search-history__list">
            {history.map((term) => (
              <li key={term}>
                <button
                  type="button"
                  className="search-history__item tap-target"
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
        <div className="search-loading" aria-live="polite" aria-busy="true">
          <p className="search-meta">{t.search.searching}</p>
          <div className="mt-4 space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="h-14 w-14 shrink-0" />
                <SkeletonText lines={2} className="flex-1" />
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {error ? (
        <p className="search-empty" role="alert">
          {error}
        </p>
      ) : null}

      {!suppressResults && result?.trending?.length && !result.hits.length && !query ? (
        <div className="search-trending">
          <p className="search-trending__label">Trending searches</p>
          <ul className="search-trending__list">
            {result.trending.map((t) => (
              <li key={t}>
                <Link
                  href={`/search?q=${encodeURIComponent(t)}`}
                  className="search-trending__link"
                  onClick={onNavigate}
                >
                  {t}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {!suppressResults && result && result.hits.length > 0 ? (
        <div className={compact ? "search-overlay-results" : ""}>
          <p className="search-meta" aria-live="polite" aria-atomic="true">
            {result.total} result{result.total === 1 ? "" : "s"}
            {result.parsed.district ? ` · ${result.parsed.district}` : ""}
            {result.tookMs ? ` · ${result.tookMs}ms` : ""}
          </p>
          <ul className="search-results" id="search-results-list" role="listbox">
            {result.hits.map((hit) => (
              <SearchHitCard
                key={hit.id}
                hit={hit}
                onNavigate={onNavigate}
              />
            ))}
          </ul>
        </div>
      ) : null}

      {!suppressResults && result && !loading && query && result.hits.length === 0 ? (
        <p className="search-empty">
          {t.search.noResults}
        </p>
      ) : null}
    </div>
  );
}

function SearchHitCard({
  hit,
  onNavigate,
}: {
  hit: SearchHit;
  onNavigate?: () => void;
}) {
  return (
    <li>
      <Link
        href={`/story/${hit.slug}`}
        className="search-hit group"
        onClick={onNavigate}
      >
        {hit.imageUrl ? (
          <div className="search-hit__thumb">
            <Image
              src={hit.imageUrl}
              alt=""
              fill
              sizes="72px"
              loading="lazy"
              placeholder="blur"
              blurDataURL={IMAGE_BLUR}
              className="object-cover"
            />
          </div>
        ) : (
          <div className="search-hit__thumb bg-[var(--paper-muted)]" />
        )}
        <div>
          <p className="search-hit__headline group-hover:opacity-85">
            {hit.headline}
          </p>
          {hit.summary ? (
            <p className="search-hit__summary">{hit.summary}</p>
          ) : null}
          <p className="search-hit__meta">
            {hit.section}
            {hit.district ? ` · ${hit.district}` : ""}
            {hit.readingTime ? ` · ${hit.readingTime}` : ""}
          </p>
        </div>
      </Link>
    </li>
  );
}
