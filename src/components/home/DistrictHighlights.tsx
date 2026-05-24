"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { DistrictHighlightCard } from "@/components/home/DistrictHighlightCard";
import { DistrictFeed } from "@/components/home/DistrictFeed";
import { Reveal } from "@/components/motion";
import {
  FEATURED_DISTRICT_SLUGS,
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

  const handleSelect = useCallback((slug: FeaturedDistrictSlug) => {
    if (slug === selected) return;
    setFeedLoading(true);
    setSelected(slug);
    window.setTimeout(() => setFeedLoading(false), 220);

    if (typeof window !== "undefined" && window.matchMedia("(max-width: 1023px)").matches) {
      requestAnimationFrame(() => {
        feedRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      });
    }
  }, [selected]);

  if (!articles.length) return null;

  return (
    <Reveal
      as="section"
      id="district-highlights"
      className="district-highlights scroll-mt-24"
      aria-labelledby="district-highlights-title"
    >
      <div className="district-highlights__head">
        <h2 id="district-highlights-title" className="district-highlights__title">
          {t.home.districtHighlights}
        </h2>
        <Link href="/live" className="district-highlights__cta tap-target">
          {t.live.viewAll} →
        </Link>
      </div>

      <div
        className="district-highlights__grid"
        role="tablist"
        aria-label={t.home.districtHighlights}
      >
        {FEATURED_DISTRICT_SLUGS.map((slug) => (
          <DistrictHighlightCard
            key={slug}
            slug={slug}
            isActive={selected === slug}
            count={counts[slug]}
            onSelect={handleSelect}
          />
        ))}
      </div>

      <div
        ref={feedRef}
        className={`district-highlights__feed-wrap${feedLoading ? " district-highlights__feed-wrap--loading" : ""}`}
      >
        <DistrictFeed
          district={selected}
          items={filtered}
          freshIds={freshIds}
        />
      </div>
    </Reveal>
  );
}
