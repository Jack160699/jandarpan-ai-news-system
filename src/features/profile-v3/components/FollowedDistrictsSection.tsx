"use client";

import Link from "next/link";
import { MapPin, Star } from "lucide-react";
import { Chip } from "@/design-system/components/Chip";
import { EmptyState } from "@/design-system/components/EmptyState";
import { DISTRICT_V3_MAX_FAVORITES, DISTRICT_V3_SELECTOR_DISTRICTS } from "@/features/district-v3/constants";
import { getDistrict } from "@/lib/regional/districts";
import { pickBilingualLabel } from "@/lib/i18n/pick-label";
import { useLanguage } from "@/providers/LanguageProvider";
import { useHomepageLayout } from "@/hooks/useHomepageLayout";
import type { HomepageLayoutPrefs } from "@/lib/personalization/types";
import { ProfileSection } from "./ProfileSection";
import type { ProfileV3Data } from "../types";

function toggleFollowedDistrict(
  layout: HomepageLayoutPrefs,
  slug: string
): HomepageLayoutPrefs {
  const has = layout.followedDistricts.includes(slug);
  const followedDistricts = has
    ? layout.followedDistricts.filter((s) => s !== slug)
    : [...layout.followedDistricts, slug].slice(0, DISTRICT_V3_MAX_FAVORITES);
  return { ...layout, followedDistricts };
}

export type FollowedDistrictsSectionProps = {
  data: ProfileV3Data;
};

export function FollowedDistrictsSection({ data }: FollowedDistrictsSectionProps) {
  const { language, t } = useLanguage();
  const { layout, persist } = useHomepageLayout();
  const showHi = language !== "en";

  const homeSlug = data.homeDistrict ?? "raipur";
  const quickAdd = DISTRICT_V3_SELECTOR_DISTRICTS.filter(
    (d) => !data.followedDistricts.includes(d.slug)
  ).slice(0, 8);

  return (
    <ProfileSection
      id="followed-districts"
      kicker={pickBilingualLabel(language, "Local", "स्थानीय")}
      title={pickBilingualLabel(language, "Followed districts", "फॉलो किए जिले")}
      description={t.profile.regionHint}
      action={<MapPin size={18} className="pv3-section-icon" aria-hidden />}
    >
      {data.followedDistricts.length === 0 ? (
        <EmptyState
          title={pickBilingualLabel(language, "No districts followed", "कोई जिला फॉलो नहीं")}
          description={pickBilingualLabel(
            language,
            "Add districts below for hyperlocal coverage in your feed.",
            "फीड में स्थानीय कवरेज के लिए नीचे जिले जोड़ें।"
          )}
          icon="📍"
        />
      ) : (
        <ul
          className="pv3-districts__list"
          aria-label={pickBilingualLabel(language, "Followed districts", "फॉलो किए जिले")}
        >
          {data.followedDistricts.map((slug) => {
            const district = getDistrict(slug);
            if (!district) return null;
            const label = showHi ? district.nameHi : district.name;
            return (
              <li key={slug} className="pv3-districts__item">
                <Link href={`/district/${slug}`} className="pv3-districts__link">
                  {label}
                  {slug === homeSlug ? (
                    <span className="pv3-districts__home">
                      {pickBilingualLabel(language, "Home", "होम")}
                    </span>
                  ) : null}
                </Link>
                <button
                  type="button"
                  className="pv3-districts__unfollow"
                  onClick={() => persist(toggleFollowedDistrict(layout, slug))}
                  aria-label={pickBilingualLabel(
                    language,
                    `Unfollow ${district.name}`,
                    `${district.nameHi} अनफॉलो`
                  )}
                >
                  <Star size={14} fill="currentColor" aria-hidden />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {quickAdd.length > 0 ? (
        <div className="pv3-districts__add">
          <p className="pv3-districts__add-label">
            {pickBilingualLabel(language, "Add district", "जिला जोड़ें")}
          </p>
          <div className="pv3-chips" role="group">
            {quickAdd.map((district) => {
              const label = showHi ? district.nameHi : district.name;
              return (
                <Chip
                  key={district.slug}
                  onClick={() => persist(toggleFollowedDistrict(layout, district.slug))}
                  aria-label={pickBilingualLabel(
                    language,
                    `Follow ${district.name}`,
                    `${district.nameHi} फॉलो`
                  )}
                >
                  <Star size={14} aria-hidden className="pv3-chips__icon" />
                  {label}
                </Chip>
              );
            })}
          </div>
        </div>
      ) : null}
    </ProfileSection>
  );
}
