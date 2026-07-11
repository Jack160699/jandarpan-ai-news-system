"use client";

import Link from "next/link";
import { Star } from "lucide-react";
import { SectionHeader } from "@/design-system/components/SectionHeader";
import { Chip } from "@/design-system/components/Chip";
import { EmptyState } from "@/design-system/components/EmptyState";
import { getDistrict } from "@/lib/regional/districts";
import { pickBilingualLabel } from "@/lib/i18n/pick-label";
import { useLanguage } from "@/providers/LanguageProvider";
import { useHomepageLayout } from "@/hooks/useHomepageLayout";
import type { HomepageLayoutPrefs } from "@/lib/personalization/types";
import { DISTRICT_V3_MAX_FAVORITES, DISTRICT_V3_SELECTOR_DISTRICTS } from "../constants";
import { DistrictCard } from "./DistrictCard";

function toggleFavorite(
  layout: HomepageLayoutPrefs,
  slug: string
): HomepageLayoutPrefs {
  const has = layout.followedDistricts.includes(slug);
  const followedDistricts = has
    ? layout.followedDistricts.filter((s) => s !== slug)
    : [...layout.followedDistricts, slug].slice(0, DISTRICT_V3_MAX_FAVORITES);
  return { ...layout, followedDistricts };
}

export type FavoriteDistrictsProps = {
  currentSlug: string;
};

export function FavoriteDistricts({ currentSlug }: FavoriteDistrictsProps) {
  const { language } = useLanguage();
  const { layout, persist } = useHomepageLayout();

  const favorites = layout.followedDistricts;
  const quickAdd = DISTRICT_V3_SELECTOR_DISTRICTS.filter(
    (d) => !favorites.includes(d.slug) && d.slug !== currentSlug
  ).slice(0, 6);

  return (
    <DistrictCard
      id="dv3-favorites"
      aria-labelledby="dv3-favorites-title"
      tone="accent"
      as="section"
    >
      <SectionHeader
        title={pickBilingualLabel(language, "Favorite districts", "पसंदीदा जिले")}
        kicker={pickBilingualLabel(language, "Follow", "फॉलो")}
        action={<Star size={18} className="dv3-section-icon" aria-hidden />}
      />
      <h2 id="dv3-favorites-title" className="sr-only">
        Favorite districts
      </h2>

      {favorites.length === 0 ? (
        <EmptyState
          title={pickBilingualLabel(language, "No favorites yet", "अभी कोई पसंदीदा नहीं")}
          description={pickBilingualLabel(
            language,
            "Tap a district below to add it to your favorites.",
            "नीचे जिला चुनकर पसंदीदा में जोड़ें।"
          )}
          icon="⭐"
        />
      ) : (
        <div
          className="dv3-favorites__list"
          role="list"
          aria-label={pickBilingualLabel(language, "Your favorite districts", "आपके पसंदीदा जिले")}
        >
          {favorites.map((slug) => {
            const district = getDistrict(slug);
            if (!district) return null;
            const label = pickBilingualLabel(language, district.name, district.nameHi);
            const active = currentSlug === slug;
            return (
              <div key={slug} role="listitem" className="dv3-favorites__item">
                <Link
                  href={`/district/${slug}`}
                  className={`dv3-favorites__link${active ? " is-active" : ""}`}
                  aria-current={active ? "page" : undefined}
                >
                  {label}
                </Link>
                <button
                  type="button"
                  className="dv3-favorites__remove"
                  onClick={() => persist(toggleFavorite(layout, slug))}
                  aria-label={pickBilingualLabel(
                    language,
                    `Remove ${district.name} from favorites`,
                    `${district.nameHi} को हटाएं`
                  )}
                >
                  <Star size={14} fill="currentColor" aria-hidden />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {quickAdd.length > 0 ? (
        <div className="dv3-favorites__add">
          <p className="dv3-favorites__add-label">
            {pickBilingualLabel(language, "Add to favorites", "पसंदीदा में जोड़ें")}
          </p>
          <div className="dv3-selector__chips" role="group">
            {quickAdd.map((district) => {
              const label = pickBilingualLabel(language, district.name, district.nameHi);
              return (
                <Chip
                  key={district.slug}
                  onClick={() => persist(toggleFavorite(layout, district.slug))}
                  aria-label={pickBilingualLabel(
                    language,
                    `Add ${district.name} to favorites`,
                    `${district.nameHi} जोड़ें`
                  )}
                >
                  <Star size={14} aria-hidden className="dv3-selector__chip-icon" />
                  {label}
                </Chip>
              );
            })}
          </div>
        </div>
      ) : null}
    </DistrictCard>
  );
}
