import Link from "next/link";
import { SearchTrendingChips } from "@/components/search/SearchTrendingChips";

export type SearchShortcut = {
  label: string;
  href: string;
};

type SearchEmptyStateProps = {
  query?: string;
  trending: string[];
  categoryShortcuts: SearchShortcut[];
  title: string;
  body: string;
  trendingTitle: string;
  trendingSubtitle?: string;
  shortcutsTitle: string;
  backLabel: string;
};

export function SearchEmptyState({
  trending,
  categoryShortcuts,
  title,
  body,
  trendingTitle,
  trendingSubtitle,
  shortcutsTitle,
  backLabel,
}: SearchEmptyStateProps) {
  return (
    <div className="search-empty-state search-empty-state--premium">
      <span className="search-empty-state__icon" aria-hidden>
        …
      </span>
      <h2 className="search-empty-state__title">{title}</h2>
      <p className="search-empty-state__body">{body}</p>

      {categoryShortcuts.length > 0 ? (
        <div className="search-empty-state__section">
          <header className="search-section-header">
            <h3 className="search-section-header__title">{shortcutsTitle}</h3>
          </header>
          <ul className="search-chip-list" role="list">
            {categoryShortcuts.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="search-chip-link tap-target">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {trending.length > 0 ? (
        <div className="search-empty-state__section">
          <SearchTrendingChips
            items={trending}
            title={trendingTitle}
            subtitle={trendingSubtitle}
          />
        </div>
      ) : null}

      <Link href="/" className="search-empty-state__back">
        {backLabel}
      </Link>
    </div>
  );
}
