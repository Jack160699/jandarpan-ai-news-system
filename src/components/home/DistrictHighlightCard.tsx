"use client";

import { memo } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { LiveBlink } from "@/components/home/LiveBlink";
import {
  getFeaturedDistrict,
  type FeaturedDistrictSlug,
} from "@/lib/homepage/district-filter";
import { useLanguage } from "@/providers/LanguageProvider";

export type DistrictHighlightCardProps = {
  slug: FeaturedDistrictSlug;
  isActive: boolean;
  count: number;
  onSelect: (slug: FeaturedDistrictSlug) => void;
};

export const DistrictHighlightCard = memo(function DistrictHighlightCard({
  slug,
  isActive,
  count,
  onSelect,
}: DistrictHighlightCardProps) {
  const { t, language } = useLanguage();
  const reduceMotion = useReducedMotion();
  const district = getFeaturedDistrict(slug);
  const label =
    language === "en"
      ? district.name
      : t.home.featuredDistricts[slug] || district.nameHi;

  return (
    <motion.button
      type="button"
      role="tab"
      aria-selected={isActive}
      aria-label={`${label}${isActive ? `, ${t.home.districtLive}` : ""}${count > 0 ? `, ${count} ${t.home.districtStories}` : ""}`}
      className={`district-highlight-card tap-target${isActive ? " district-highlight-card--active" : ""}`}
      onClick={() => onSelect(slug)}
      whileTap={reduceMotion ? undefined : { scale: 0.98 }}
      animate={
        reduceMotion
          ? undefined
          : { scale: isActive ? 1.02 : 1 }
      }
      transition={{ type: "spring", stiffness: 440, damping: 30 }}
    >
      <span className="district-highlight-card__glow" aria-hidden />
      <span className="district-highlight-card__inner">
        <span className="district-highlight-card__row">
          <span className="district-highlight-card__name">{label}</span>
          {isActive ? (
            <LiveBlink intense label={t.home.districtLive} />
          ) : null}
        </span>
        {isActive && count > 0 ? (
          <span className="district-highlight-card__count">
            {count} {t.home.districtStories}
          </span>
        ) : null}
      </span>
    </motion.button>
  );
});
