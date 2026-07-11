"use client";

import { Clock } from "lucide-react";
import { SectionHeader } from "@/design-system/components/SectionHeader";
import { Chip } from "@/design-system/components/Chip";
import { useLanguage } from "@/providers/LanguageProvider";
import { useSearchHistory } from "../core/SearchHistory";

type RecentSearchesProps = {
  onSelect: (term: string) => void;
};

export function RecentSearches({ onSelect }: RecentSearchesProps) {
  const { t } = useLanguage();
  const { history, clear } = useSearchHistory();

  if (history.length === 0) return null;

  const title = t.search.recentSearches ?? "Recent searches";
  const clearLabel = t.search.clearHistory ?? "Clear";

  return (
    <section className="search-v3__section" aria-labelledby="search-v3-recent">
      <SectionHeader
        title={title}
        actionLabel={clearLabel}
        onActionClick={clear}
      />
      <ul className="search-v3__chip-list" role="list" id="search-v3-recent">
        {history.map((term) => (
          <li key={term}>
            <Chip
              onClick={() => onSelect(term)}
              aria-label={`${title}: ${term}`}
            >
              <Clock size={14} aria-hidden className="search-v3__chip-icon" />
              {term}
            </Chip>
          </li>
        ))}
      </ul>
    </section>
  );
}
