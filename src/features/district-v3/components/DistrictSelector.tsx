"use client";

import { useRouter } from "next/navigation";
import { MapPin } from "lucide-react";
import { SectionHeader } from "@/design-system/components/SectionHeader";
import { Chip } from "@/design-system/components/Chip";
import { pickBilingualLabel } from "@/lib/i18n/pick-label";
import { useLanguage } from "@/providers/LanguageProvider";
import { useReaderPreferences } from "@/providers/ReaderPreferencesProvider";
import { DISTRICT_V3_SELECTOR_DISTRICTS } from "../constants";
import { DistrictCard } from "./DistrictCard";

export type DistrictSelectorProps = {
  currentSlug: string;
};

export function DistrictSelector({ currentSlug }: DistrictSelectorProps) {
  const router = useRouter();
  const { language } = useLanguage();
  const { setHomeDistrict } = useReaderPreferences();

  const handleSelect = (slug: string) => {
    setHomeDistrict(slug);
    router.push(`/district/${slug}`);
  };

  return (
    <DistrictCard
      id="dv3-selector"
      aria-labelledby="dv3-selector-title"
      tone="muted"
      as="section"
    >
      <SectionHeader
        title={pickBilingualLabel(language, "Switch district", "जिला बदलें")}
        kicker={pickBilingualLabel(language, "Chhattisgarh", "छत्तीसगढ़")}
      />
      <h2 id="dv3-selector-title" className="sr-only">
        District selector
      </h2>

      <div
        className="dv3-selector__chips"
        role="group"
        aria-label={pickBilingualLabel(language, "Select district", "जिला चुनें")}
      >
        {DISTRICT_V3_SELECTOR_DISTRICTS.map((district) => {
          const label = pickBilingualLabel(language, district.name, district.nameHi);
          const selected = currentSlug === district.slug;
          return (
            <Chip
              key={district.slug}
              selected={selected}
              onClick={() => handleSelect(district.slug)}
              aria-pressed={selected}
            >
              <MapPin size={14} aria-hidden className="dv3-selector__chip-icon" />
              {label}
            </Chip>
          );
        })}
      </div>
    </DistrictCard>
  );
}
