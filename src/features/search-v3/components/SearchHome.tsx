"use client";

import { RecentSearches } from "./RecentSearches";
import { TrendingSearches } from "./TrendingSearches";
import { DistrictSearch } from "./DistrictSearch";
import { TopicSearch } from "./TopicSearch";

type SearchHomeProps = {
  trending: string[];
  selectedDistrict: string | null;
  onQuerySelect: (term: string) => void;
  onDistrictSelect: (districtId: string | null) => void;
  onTopicSelect: (query: string) => void;
};

export function SearchHome({
  trending,
  selectedDistrict,
  onQuerySelect,
  onDistrictSelect,
  onTopicSelect,
}: SearchHomeProps) {
  return (
    <div className="search-v3-home">
      <RecentSearches onSelect={onQuerySelect} />
      {trending.length > 0 ? (
        <TrendingSearches items={trending} onSelect={onQuerySelect} />
      ) : null}
      <DistrictSearch
        selectedDistrict={selectedDistrict}
        onSelect={onDistrictSelect}
      />
      <TopicSearch onSelect={onTopicSelect} />
    </div>
  );
}
