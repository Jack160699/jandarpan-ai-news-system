"use client";

import { memo } from "react";
import { NationalNewsCard } from "@/components/home/NationalNewsCard";
import { homeArticleToQuickUpdate } from "@/lib/homepage/quick-update";
import type { NationalSegment } from "@/lib/homepage/national-filter";
import type { HomeArticle } from "@/lib/homepage/types";
import { useLanguage } from "@/providers/LanguageProvider";

type NationalHighlightsFeedProps = {
  segment: NationalSegment;
  items: HomeArticle[];
  freshIds?: ReadonlySet<string>;
};

export const NationalHighlightsFeed = memo(function NationalHighlightsFeed({
  segment,
  items,
  freshIds,
}: NationalHighlightsFeedProps) {
  const { t, language } = useLanguage();
  const slice = items.slice(0, 6);

  return (
    <div
      key={segment}
      role="feed"
      aria-label={
        segment === "national"
          ? t.home.nationalNewsTab
          : t.home.internationalNewsTab
      }
      className={`national-highlights-feed hp-feed-swap${segment === "international" ? " national-highlights-feed--international" : ""}`}
    >
      {slice.length === 0 ? (
        <div
          className={`hp-empty-state${segment === "international" ? " hp-empty-state--international" : ""}`}
          role="status"
        >
          <span className="hp-empty-state__icon" aria-hidden>
            …
          </span>
          <p className="hp-empty-state__message">{t.home.nationalSegmentEmpty}</p>
        </div>
      ) : (
        <div className="national-highlights-feed__list">
          {slice.map((article, index) => (
            <NationalNewsCard
              key={article.id}
              {...homeArticleToQuickUpdate(article, language)}
              listPosition={index + 1}
              index={index}
              isIncoming={freshIds?.has(article.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
});
