"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { DistrictFeed } from "@/components/home/DistrictFeed";
import { DistrictSegmentedControl } from "@/components/home/DistrictSegmentedControl";
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
      className="district-wire-panel scroll-mt-24 w-full min-w-0 space-y-3"
      aria-labelledby="district-wire-title"
    >
      <div className="flex items-baseline justify-between gap-3">
        <h2
          id="district-wire-title"
          className="m-0 font-[family-name:var(--font-hindi,var(--font-display))] text-[clamp(1.125rem,4.2vw,1.3125rem)] font-bold leading-tight tracking-tight text-stone-900 dark:text-stone-50"
        >
          {t.home.districtWire}
        </h2>
        <Link
          href="/live"
          className="tap-target shrink-0 text-[13px] font-bold text-[#a01830] no-underline dark:text-red-400"
        >
          {t.live.viewAll} →
        </Link>
      </div>

      <DistrictSegmentedControl
        selected={selected}
        counts={counts}
        onSelect={handleSelect}
      />

      <div
        className={cn(
          "district-wire-panel__feed rounded-[20px] border p-2.5 transition-opacity duration-200",
          "border-stone-200/50 bg-stone-100/35 backdrop-blur-md",
          "dark:border-stone-700/45 dark:bg-stone-950/55 dark:shadow-[0_8px_32px_rgba(0,0,0,0.35)]",
          feedLoading && "opacity-70"
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
