"use client";

import { Chip } from "@/design-system/components/Chip";
import { useLanguage } from "@/providers/LanguageProvider";
import { pickBilingualLabel } from "@/lib/i18n/pick-label";
import type { FeaturedDistrictSlug } from "@/lib/homepage/district-filter";
import { LIVE_V3_DISTRICT_OPTIONS } from "../constants";

export type DistrictFilterProps = {
  district: FeaturedDistrictSlug | null;
  counts?: Map<FeaturedDistrictSlug, number>;
  onDistrictChange: (district: FeaturedDistrictSlug | null) => void;
};

export function DistrictFilter({
  district,
  counts,
  onDistrictChange,
}: DistrictFilterProps) {
  const { language } = useLanguage();

  return (
    <div
      className="lv3-district-filter"
      role="group"
      aria-label="District filter"
    >
      <span className="lv3-district-filter__label">District</span>
      <div className="lv3-district-filter__chips">
        <Chip
          selected={district === null}
          onClick={() => onDistrictChange(null)}
          aria-pressed={district === null}
        >
          All CG
        </Chip>
        {LIVE_V3_DISTRICT_OPTIONS.map((option) => {
          const label = pickBilingualLabel(
            language,
            option.label,
            option.labelHi
          );
          const selected = district === option.slug;
          const count = counts?.get(option.slug);
          return (
            <Chip
              key={option.slug}
              selected={selected}
              onClick={() =>
                onDistrictChange(selected ? null : option.slug)
              }
              aria-pressed={selected}
            >
              {label}
              {count !== undefined && count > 0 ? (
                <span className="lv3-district-filter__count" aria-hidden>
                  {count}
                </span>
              ) : null}
            </Chip>
          );
        })}
      </div>
    </div>
  );
}
