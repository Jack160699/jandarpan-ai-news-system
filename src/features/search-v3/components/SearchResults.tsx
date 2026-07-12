"use client";

import { useRouter } from "next/navigation";
import type { SearchHit } from "@/lib/search/types";
import { ArticleSearch } from "./ArticleSearch";
import { useSearchKeyboard } from "../core/SearchKeyboard";

type SearchResultsProps = {
  hits: SearchHit[];
  total: number;
  tookMs?: number;
  districtLabel?: string | null;
  listId?: string;
  compact?: boolean;
  onNavigate?: () => void;
};

export function SearchResults({
  hits,
  total,
  tookMs,
  districtLabel,
  listId = "search-v3-results",
  compact = false,
  onNavigate,
}: SearchResultsProps) {
  const router = useRouter();

  const { activeIndex, setActiveIndex, getOptionId, activeDescendantId } =
    useSearchKeyboard({
      itemCount: hits.length,
      enabled: hits.length > 0,
      listId,
      onSelect: (index) => {
        const hit = hits[index];
        if (hit) {
          onNavigate?.();
          router.push(`/story/${hit.slug}`);
        }
      },
    });

  return (
    <section className="search-v3-results" aria-labelledby={`${listId}-label`}>
      <p
        id={`${listId}-label`}
        className="search-v3-results__meta"
        aria-live="polite"
        aria-atomic="true"
      >
        <span className="search-v3-results__count">{total}</span>{" "}
        {total === 1 ? "result" : "results"}
        {districtLabel ? ` · ${districtLabel}` : ""}
        {tookMs ? ` · ${tookMs}ms` : ""}
      </p>
      <ul
        className="search-v3-results__list"
        id={listId}
        role="listbox"
        aria-label="Search results"
        aria-activedescendant={activeDescendantId}
      >
        {hits.map((hit, index) => (
          <ArticleSearch
            key={hit.id}
            hit={hit}
            index={index}
            active={index === activeIndex}
            optionId={getOptionId(index)}
            onNavigate={onNavigate}
            onHover={() => setActiveIndex(index)}
            priority={index < 2 && !compact}
          />
        ))}
      </ul>
    </section>
  );
}
