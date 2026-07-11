"use client";

import { MapPin } from "lucide-react";
import { SectionHeader } from "@/design-system/components/SectionHeader";
import { Chip } from "@/design-system/components/Chip";
import { useLanguage } from "@/providers/LanguageProvider";
import { pickBilingualLabel } from "@/lib/i18n/pick-label";
import { SEARCH_V3_DISTRICTS } from "../constants";

type DistrictSearchProps = {
  selectedDistrict: string | null;
  onSelect: (districtId: string | null) => void;
};

export function DistrictSearch({ selectedDistrict, onSelect }: DistrictSearchProps) {
  const { language, t } = useLanguage();

  return (
    <section className="search-v3__section" aria-labelledby="search-v3-districts">
      <SectionHeader
        title={t.nav.districtsTitle}
        kicker={t.search.hint}
      />
      <div
        className="search-v3__chip-list search-v3__chip-list--wrap"
        role="group"
        aria-label={t.nav.districtsTitle}
        id="search-v3-districts"
      >
        {SEARCH_V3_DISTRICTS.map((district) => {
          const label = pickBilingualLabel(
            language,
            district.label,
            district.labelHi ?? district.label
          );
          const selected = selectedDistrict === district.id;
          return (
            <Chip
              key={district.id}
              selected={selected}
              onClick={() => onSelect(selected ? null : district.id)}
              aria-pressed={selected}
            >
              <MapPin size={14} aria-hidden className="search-v3__chip-icon" />
              {label}
            </Chip>
          );
        })}
      </div>
    </section>
  );
}
