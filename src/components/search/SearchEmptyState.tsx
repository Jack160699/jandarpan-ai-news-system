import Link from "next/link";

type SearchEmptyStateProps = {
  query?: string;
  showSuggestions?: boolean;
};

const SUGGESTIONS = [
  "Raipur",
  "Chhattisgarh politics",
  "Bastar",
  "CG budget",
  "Crime",
];

export function SearchEmptyState({
  query,
  showSuggestions = true,
}: SearchEmptyStateProps) {
  return (
    <div className="search-empty-state mt-8 rounded-xl border border-dashed border-[var(--rule)] p-8">
      <h2 className="text-lg font-semibold">No stories match</h2>
      <p className="mt-2 text-[var(--ink-muted)]">
        {query
          ? `We couldn't find results for “${query}”. Try a broader term or remove filters.`
          : "Try a different search term or remove filters."}
      </p>
      {showSuggestions ? (
        <div className="mt-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-muted)]">
            Try searching for
          </p>
          <ul className="search-trending__list mt-3">
            {SUGGESTIONS.map((term) => (
              <li key={term}>
                <Link
                  href={`/search?q=${encodeURIComponent(term)}`}
                  className="search-trending__link"
                >
                  {term}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <Link
        href="/"
        className="mt-6 inline-flex text-sm font-semibold text-[var(--brand-maroon)]"
      >
        ← Back to today&apos;s edition
      </Link>
    </div>
  );
}
