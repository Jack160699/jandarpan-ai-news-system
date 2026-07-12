"use client";

import { SearchX } from "lucide-react";
import { EmptyState } from "@/design-system/components/EmptyState";
import { useLanguage } from "@/providers/LanguageProvider";
import { TrendingSearches } from "./TrendingSearches";
import { TopicSearch } from "./TopicSearch";

type SearchEmptyProps = {
  query?: string;
  trending?: string[];
  onTrendingSelect: (term: string) => void;
  onTopicSelect: (query: string) => void;
};

export function SearchEmpty({
  query,
  trending = [],
  onTrendingSelect,
  onTopicSelect,
}: SearchEmptyProps) {
  const { t } = useLanguage();

  return (
    <div className="search-v3-empty">
      <EmptyState
        title={t.search.noResults}
        description={
          query
            ? `${t.search.noResults} for "${query}". ${t.search.hint}`
            : t.search.hint
        }
        icon={<SearchX size={28} aria-hidden />}
      />
      {trending.length > 0 ? (
        <TrendingSearches items={trending} onSelect={onTrendingSelect} />
      ) : null}
      <TopicSearch onSelect={onTopicSelect} />
    </div>
  );
}
