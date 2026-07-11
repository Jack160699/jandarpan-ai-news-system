"use client";

import { useCallback, useMemo, useState } from "react";
import { NationalHighlightsFeed } from "@/components/home/NationalHighlightsFeed";
import { NationalSegmentedControl } from "@/components/home/NationalSegmentedControl";
import { SectionHeader } from "@/components/homepage/SectionHeader";
import { Reveal } from "@/components/motion";
import {
  buildNationalArticlePool,
  countArticlesByNationalSegment,
  defaultNationalSegment,
  filterArticlesByNationalSegment,
  type NationalSegment,
} from "@/lib/homepage/national-filter";
import type { GeneratedHomepageFeed, HomeArticle } from "@/lib/homepage/types";
import { useLanguage } from "@/providers/LanguageProvider";
import { cn } from "@/lib/cn";

type NationalHighlightsProps = {
  articles: HomeArticle[];
  feed?: GeneratedHomepageFeed;
  freshIds?: ReadonlySet<string>;
  embedded?: boolean;
};

export function NationalHighlights({
  articles: wireArticles,
  feed,
  freshIds,
  embedded = true,
}: NationalHighlightsProps) {
  const { t } = useLanguage();

  const pool = useMemo(() => {
    if (feed) return buildNationalArticlePool(feed, wireArticles);
    return wireArticles;
  }, [feed, wireArticles]);

  const counts = useMemo(() => countArticlesByNationalSegment(pool), [pool]);
  const [selected, setSelected] = useState<NationalSegment>(() =>
    defaultNationalSegment(counts)
  );
  const [feedLoading, setFeedLoading] = useState(false);

  const filtered = useMemo(
    () => filterArticlesByNationalSegment(pool, selected),
    [pool, selected]
  );

  const handleSelect = useCallback(
    (segment: NationalSegment) => {
      if (segment === selected) return;
      setFeedLoading(true);
      setSelected(segment);
      window.setTimeout(() => setFeedLoading(false), 220);
    },
    [selected]
  );

  const activeCount = counts[selected];
  const activeLabel =
    selected === "national"
      ? t.home.nationalNewsTab
      : t.home.internationalNewsTab;

  return (
    <Reveal
      as="section"
      id={embedded ? "global-brief" : "wire"}
      className={cn(
        "scroll-mt-24 w-full min-w-0 hp-section hp-section--secondary",
        embedded && "global-brief-panel"
      )}
      aria-labelledby="global-brief-title"
    >
      <SectionHeader
        id="global-brief-title"
        title={t.home.globalBrief}
        description={t.home.latestNews}
        href="/live"
        hrefLabel={t.common.seeAll}
      />

      <div className="global-brief-panel__inner">
        <NationalSegmentedControl
          selected={selected}
          counts={counts}
          onSelect={handleSelect}
        />

        <div
          key={`${selected}-bar`}
          className="global-brief-panel__status"
          role="status"
        >
          <span className="global-brief-panel__status-dot" aria-hidden />
          <p className="global-brief-panel__status-label">
            <span className="global-brief-panel__status-live">
              {t.home.districtLivePrefix}:
            </span>{" "}
            {activeLabel}
          </p>
          <p className="global-brief-panel__status-count">
            <strong>{activeCount}</strong> {t.home.districtLiveStoriesLabel}
          </p>
        </div>

        <div
          className={cn(
            "global-brief-panel__feed-wrap",
            feedLoading && "is-loading"
          )}
        >
          <NationalHighlightsFeed
            segment={selected}
            items={filtered}
            freshIds={freshIds}
          />
        </div>
      </div>
    </Reveal>
  );
}
