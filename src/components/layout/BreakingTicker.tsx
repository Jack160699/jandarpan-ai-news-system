"use client";

import { useState } from "react";
import { TrackedStoryLink } from "@/components/analytics/TrackedStoryLink";
import { useLanguage } from "@/providers/LanguageProvider";
import type { HomeArticle } from "@/lib/homepage/types";

type BreakingTickerProps = {
  items: HomeArticle[];
  freshIds?: ReadonlySet<string>;
};

export function BreakingTicker({ items, freshIds }: BreakingTickerProps) {
  const [paused, setPaused] = useState(false);
  const { t } = useLanguage();
  const hasHeadlines = items.length > 0;
  const doubled = hasHeadlines ? [...items, ...items] : [];

  const pause = () => setPaused(true);
  const resume = () => setPaused(false);

  return (
    <section
      className={`breaking-ticker breaking-ticker--live${paused ? " breaking-ticker--paused" : ""}`}
      aria-label={t.home.tickerAria}
      onPointerDown={pause}
      onPointerUp={resume}
      onPointerLeave={resume}
      onPointerCancel={resume}
    >
      <div className="breaking-ticker__label">
        <span className="breaking-ticker__dot" aria-hidden />
        <span className="breaking-ticker__live-text">{t.common.live}</span>
      </div>

      <div className="breaking-ticker__viewport">
        {hasHeadlines ? (
          <div
            className="breaking-ticker__track"
            role="list"
            style={
              { "--live-ticker-items": items.length } as React.CSSProperties
            }
          >
            {doubled.map((item, index) => (
              <TrackedStoryLink
                key={`${item.id}-${index}`}
                href={`/story/${item.slug}`}
                slug={item.slug}
                category={item.section}
                region={item.section}
                surface="breaking"
                role="listitem"
                aria-hidden={index >= items.length ? true : undefined}
                tabIndex={index >= items.length ? -1 : undefined}
                className={`breaking-ticker__pill${freshIds?.has(item.id) ? " breaking-ticker__pill--fresh" : ""}`}
              >
                {item.headline}
              </TrackedStoryLink>
            ))}
          </div>
        ) : (
          <p className="breaking-ticker__fallback">{t.home.tickerFallback}</p>
        )}
      </div>
    </section>
  );
}
