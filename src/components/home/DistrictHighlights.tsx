"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { DistrictFeed } from "@/components/home/DistrictFeed";
import { DistrictSegmentedControl } from "@/components/home/DistrictSegmentedControl";
import { SectionHeader } from "@/components/homepage/SectionHeader";
import { Reveal } from "@/components/motion";
import {
  countArticlesByDistrict,
  defaultFeaturedDistrict,
  filterArticlesByDistrict,
  type FeaturedDistrictSlug,
} from "@/lib/homepage/district-filter";
import type { HomeArticle } from "@/lib/homepage/types";
import { useLanguage } from "@/providers/LanguageProvider";

type DistrictHighlightsProps = {
  articles: HomeArticle[];
  freshIds?: ReadonlySet<string>;
};

export function DistrictHighlights({
  articles,
  freshIds,
}: DistrictHighlightsProps) {
  const { t } = useLanguage();
  const feedRef = useRef<HTMLDivElement>(null);
  const counts = useMemo(() => countArticlesByDistrict(articles), [articles]);
  const [selected, setSelected] = useState<FeaturedDistrictSlug>(() =>
    defaultFeaturedDistrict(counts)
  );
  const [feedLoading, setFeedLoading] = useState(false);

  const filtered = useMemo(
    () => filterArticlesByDistrict(articles, selected),
    [articles, selected]
  );

  const handleSelect = useCallback(
    (slug: FeaturedDistrictSlug) => {
      if (slug === selected) return;
      setFeedLoading(true);
      setSelected(slug);
      window.setTimeout(() => setFeedLoading(false), 220);

      if (
        typeof window !== "undefined" &&
        window.matchMedia("(max-width: 1023px)").matches
      ) {
        requestAnimationFrame(() => {
          feedRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "nearest",
          });
        });
      }
    },
    [selected]
  );

  return (
    <Reveal
      as="section"
      id="district-wire"
      className="district-wire-panel hp-section hp-section--secondary scroll-mt-24 w-full min-w-0"
      aria-labelledby="district-wire-title"
    >
      <SectionHeader
        id="district-wire-title"
        title={t.home.districtWire}
        description={t.home.liveDesk}
        href="/live"
        hrefLabel={t.common.seeAll}
      />

      <DistrictSegmentedControl
        selected={selected}
        counts={counts}
        onSelect={handleSelect}
      />

      <div
        className={cn(
          "district-wire-panel__feed",
          feedLoading && "is-loading"
        )}
      >
        <div ref={feedRef} className="scroll-mt-[5.5rem]">
          <DistrictFeed
            district={selected}
            items={filtered}
            freshIds={freshIds}
          />
        </div>
      </div>
    </Reveal>
  );
}
