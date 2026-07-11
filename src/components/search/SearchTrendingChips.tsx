import Link from "next/link";

type SearchTrendingChipsProps = {
  items: string[];
  title: string;
  subtitle?: string;
  className?: string;
};

export function SearchTrendingChips({
  items,
  title,
  subtitle,
  className = "",
}: SearchTrendingChipsProps) {
  if (!items.length) return null;

  return (
    <section
      className={`search-trending ${className}`.trim()}
      aria-labelledby="search-trending-title"
    >
      <header className="search-section-header">
        <h2 id="search-trending-title" className="search-section-header__title">
          {title}
        </h2>
        {subtitle ? (
          <p className="search-section-header__subtitle">{subtitle}</p>
        ) : null}
      </header>
      <ul className="search-chip-list" role="list">
        {items.map((term) => (
          <li key={term}>
            <Link
              href={`/search?q=${encodeURIComponent(term)}`}
              className="search-chip-link tap-target"
            >
              {term}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
