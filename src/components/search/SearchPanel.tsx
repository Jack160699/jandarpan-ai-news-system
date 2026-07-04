"use client";

import Link from "next/link";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Skeleton, SkeletonText } from "@/components/ui/Skeleton";
import { IMAGE_BLUR } from "@/lib/image-placeholder";
import type { SearchHit, SearchResult } from "@/lib/search/types";
import type { HomeSectionId } from "@/lib/homepage/types";

type SearchPanelProps = {
  initialQuery?: string;
  compact?: boolean;
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
  compact = false,
  onNavigate,
}: SearchPanelProps) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [district, setDistrict] = useState<string | null>(null);
  const [category, setCategory] = useState<HomeSectionId | null>(null);
  const [timeScope, setTimeScope] = useState<"today" | "week" | "all">("all");
  const [result, setResult] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runSearch = useCallback(
    async (q: string) => {
      if (!q.trim() && !district && !category) {
        setResult(null);
        return;
      }

      setLoading(true);
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
        }
      } catch {
        setResult(null);
      } finally {
        setLoading(false);
      }
    },
    [district, category, timeScope, compact]
  );

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      runSearch(query);
    }, 280);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, district, category, timeScope, runSearch]);

  const openFullSearch = () => {
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (district) params.set("district", district);
    if (category) params.set("category", category);
    if (timeScope !== "all") params.set("time", timeScope);
    onNavigate?.();
    router.push(`/search?${params.toString()}`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    openFullSearch();
  };

  return (
    <div className={compact ? "" : "search-page"}>
      <form className="search-form" onSubmit={handleSubmit}>
        <input
          type="search"
          className="search-form__input"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search in Hindi or English…"
          aria-label="Search news"
          autoComplete="off"
        />

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
            See all results →
          </button>
        ) : null}
      </form>

      {loading ? (
        <div className="search-loading" aria-live="polite" aria-busy="true">
          <p className="search-meta">Searching…</p>
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

      {result?.trending?.length && !result.hits.length && !query ? (
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

      {result && result.hits.length > 0 ? (
        <div className={compact ? "search-overlay-results" : ""}>
          {result.parsed.district || result.parsed.category ? (
            <p className="search-meta">
              {result.total} result{result.total === 1 ? "" : "s"}
              {result.parsed.district ? ` · ${result.parsed.district}` : ""}
              {result.tookMs ? ` · ${result.tookMs}ms` : ""}
            </p>
          ) : (
            <p className="search-meta">
              {result.total} result{result.total === 1 ? "" : "s"} ·{" "}
              {result.tookMs}ms
            </p>
          )}
          <ul className="search-results">
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

      {result && !loading && query && result.hits.length === 0 ? (
        <p className="search-empty">No stories match. Try a broader term or remove filters.</p>
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
