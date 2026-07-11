"use client";

import type { HomeSectionId } from "@/lib/homepage/types";
import type { SearchTimeScope } from "@/lib/search/types";
import { Chip } from "@/design-system/components/Chip";
import { useLanguage } from "@/providers/LanguageProvider";
import { pickBilingualLabel } from "@/lib/i18n/pick-label";
import {
  SEARCH_FILTER_CATEGORIES,
  SEARCH_QUICK_DISTRICTS,
} from "../core/SearchFilters";

type FilterChipsProps = {
  district: string | null;
  category: HomeSectionId | null;
  timeScope: SearchTimeScope;
  onDistrictChange: (value: string | null) => void;
  onCategoryChange: (value: HomeSectionId | null) => void;
  onTimeChange: (value: SearchTimeScope) => void;
};

export function FilterChips({
  district,
  category,
  timeScope,
  onDistrictChange,
  onCategoryChange,
  onTimeChange,
}: FilterChipsProps) {
  const { language, t } = useLanguage();

  return (
    <div
      className="search-v3-filters"
      role="group"
      aria-label="Search filters"
    >
      <div className="search-v3-filters__row">
        {SEARCH_QUICK_DISTRICTS.map((d) => {
          const label = pickBilingualLabel(language, d.label, d.labelHi);
          const selected = district === d.id;
          return (
            <Chip
              key={d.id}
              selected={selected}
              onClick={() => onDistrictChange(selected ? null : d.id)}
              aria-pressed={selected}
            >
              {label}
            </Chip>
          );
        })}
      </div>

      <div className="search-v3-filters__row">
        {SEARCH_FILTER_CATEGORIES.map((c) => {
          const label = pickBilingualLabel(language, c.label, c.labelHi ?? c.label);
          const selected = category === c.id;
          return (
            <Chip
              key={c.id}
              selected={selected}
              topic={
                c.id === "india"
                  ? "politics"
                  : c.id === "sports"
                    ? "sports"
                    : c.id === "business"
                      ? "business"
                      : "default"
              }
              onClick={() => onCategoryChange(selected ? null : c.id)}
              aria-pressed={selected}
            >
              {label}
            </Chip>
          );
        })}
        <Chip
          selected={timeScope === "today"}
          onClick={() => onTimeChange(timeScope === "today" ? "all" : "today")}
          aria-pressed={timeScope === "today"}
        >
          {t.common.today}
        </Chip>
        <Chip
          selected={timeScope === "week"}
          onClick={() => onTimeChange(timeScope === "week" ? "all" : "week")}
          aria-pressed={timeScope === "week"}
        >
          Week
        </Chip>
      </div>
    </div>
  );
}
