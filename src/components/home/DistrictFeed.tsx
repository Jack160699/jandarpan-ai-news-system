"use client";

import { memo } from "react";
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

  if (!items.length) {
    return (
      <div className="hp-empty-state" role="status">
        <span className="hp-empty-state__icon" aria-hidden>
          …
        </span>
        <p className="hp-empty-state__message">{t.home.districtEmpty}</p>
      </div>
    );
  }

  return (
    <div key={district} className="district-feed hp-feed-swap" role="region" aria-live="polite">
      <QuickUpdateFeed
        items={items.slice(0, 6)}
        variant="feed"
        freshIds={freshIds}
        className="district-feed__list"
      />
    </div>
  );
});
