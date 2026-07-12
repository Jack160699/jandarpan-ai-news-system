"use client";

import { TrendingUp } from "lucide-react";
import { SectionHeader } from "@/design-system/components/SectionHeader";
import { Chip } from "@/design-system/components/Chip";
import { useLanguage } from "@/providers/LanguageProvider";

type TrendingSearchesProps = {
  items: string[];
  onSelect: (term: string) => void;
};

export function TrendingSearches({ items, onSelect }: TrendingSearchesProps) {
  const { t } = useLanguage();

  if (items.length === 0) return null;

  return (
    <section className="search-v3__section" aria-labelledby="search-v3-trending">
      <SectionHeader
        title={t.home.trending}
        kicker={t.search.hint}
      />
      <ul className="search-v3__chip-list" role="list" id="search-v3-trending">
        {items.map((term) => (
          <li key={term}>
            <Chip onClick={() => onSelect(term)} aria-label={`${t.home.trending}: ${term}`}>
              <TrendingUp size={14} aria-hidden className="search-v3__chip-icon" />
              {term}
            </Chip>
          </li>
        ))}
      </ul>
    </section>
  );
}
