"use client";

import { memo } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { QuickUpdateFeed } from "@/components/quick-update/QuickUpdateFeed";
import type { FeaturedDistrictSlug } from "@/lib/homepage/district-filter";
import type { HomeArticle } from "@/lib/homepage/types";
import { useLanguage } from "@/providers/LanguageProvider";

type DistrictFeedProps = {
  district: FeaturedDistrictSlug;
  items: HomeArticle[];
  freshIds?: ReadonlySet<string>;
};

export const DistrictFeed = memo(function DistrictFeed({
  district,
  items,
  freshIds,
}: DistrictFeedProps) {
  const { t } = useLanguage();
  const reduceMotion = useReducedMotion();

  if (!items.length) {
    return (
      <p className="district-feed__empty" role="status">
        {t.home.districtEmpty}
      </p>
    );
  }

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={district}
        className="district-feed"
        role="region"
        aria-live="polite"
        initial={reduceMotion ? false : { opacity: 0, y: 10 }}
        animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
        exit={reduceMotion ? undefined : { opacity: 0, y: -6 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      >
        <QuickUpdateFeed
          items={items.slice(0, 6)}
          variant="feed"
          freshIds={freshIds}
          className="district-feed__list"
        />
      </motion.div>
    </AnimatePresence>
  );
});
