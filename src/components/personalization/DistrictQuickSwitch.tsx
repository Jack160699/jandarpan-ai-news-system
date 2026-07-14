"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { CG_DISTRICTS, getDistrict } from "@/lib/regional/districts";
import { pickBilingualLabel } from "@/lib/i18n/pick-label";
import { useLanguage } from "@/providers/LanguageProvider";
import { useReaderPreferences } from "@/providers/ReaderPreferencesProvider";
import { useHomepageLayout } from "@/hooks/useHomepageLayout";
import type { HomepageLayoutPrefs } from "@/lib/personalization/types";
import { triggerHaptic } from "@/lib/mobile/haptics";

const QUICK_DISTRICTS = CG_DISTRICTS.filter((d) => d.priority <= 2).slice(0, 8);

function toggleFollowed(
  layout: HomepageLayoutPrefs,
  slug: string
): HomepageLayoutPrefs {
  const has = layout.followedDistricts.includes(slug);
  const followedDistricts = has
    ? layout.followedDistricts.filter((s) => s !== slug)
    : [...layout.followedDistricts, slug].slice(0, 6);
  return { ...layout, followedDistricts };
}

export function DistrictQuickSwitch() {
  const { language } = useLanguage();
  const { prefs, setHomeDistrict } = useReaderPreferences();
  const { layout, persist } = useHomepageLayout();
  const router = useRouter();

  const current = prefs.homeDistrict ?? "raipur";
  const currentLabel = useMemo(() => {
    const d = getDistrict(current);
    if (!d) return current;
    return pickBilingualLabel(language, d.name, d.nameHi);
  }, [current, language]);

  return (
    <section
      className="hp-district-switch"
      aria-label={pickBilingualLabel(language, "Your district", "आपका जिला")}
    >
      <div className="hp-district-switch__head">
        <p className="hp-district-switch__label">
          {pickBilingualLabel(language, "Your district", "आपका जिला")}
        </p>
        <Link href="/places" className="hp-district-switch__link">
          {currentLabel} · {pickBilingualLabel(language, "Change", "बदलें")}
        </Link>
      </div>
      <div className="hp-district-switch__chips" role="group">
        {QUICK_DISTRICTS.map((d) => {
          const active = current === d.slug;
          const followed = layout.followedDistricts.includes(d.slug);
          return (
            <button
              key={d.slug}
              type="button"
              className={`hp-district-switch__chip tap-target${active ? " is-active" : ""}${followed ? " is-followed" : ""}`}
              aria-pressed={active}
              onClick={() => {
                triggerHaptic("selection");
                setHomeDistrict(d.slug);
                router.push(`/district/${d.slug}`);
              }}
              onContextMenu={(e) => {
                e.preventDefault();
                persist(toggleFollowed(layout, d.slug));
              }}
              title={pickBilingualLabel(
                language,
                "Click to set · right-click to follow",
                "सेट करें · फॉलो के लिए राइट-क्लिक"
              )}
            >
              {pickBilingualLabel(language, d.name, d.nameHi)}
            </button>
          );
        })}
      </div>
    </section>
  );
}
