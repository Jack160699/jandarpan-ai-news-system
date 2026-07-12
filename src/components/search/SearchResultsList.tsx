import { SearchHitCard } from "@/components/search/SearchHitCard";
import type { SearchHit } from "@/lib/search/types";

type SearchResultsListProps = {
  hits: SearchHit[];
};

export function SearchResultsList({ hits }: SearchResultsListProps) {
  if (!hits.length) return null;

  return (
    <ul
      className="search-results search-results--premium"
      id="search-results-list"
      role="listbox"
      aria-label="Search results"
    >
      {hits.map((hit, index) => (
        <SearchHitCard key={hit.id} hit={hit} priority={index < 2} />
      ))}
    </ul>
  );
}
