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

  if (!items.length) return null;

  const doubled = [...items, ...items];

  return (
    <section
      className={`breaking-ticker pl-scroll-target${paused ? " breaking-ticker--paused" : ""}`}
      aria-label={t.home.tickerAria}
      onPointerDown={() => setPaused(true)}
      onPointerUp={() => setPaused(false)}
      onPointerLeave={() => setPaused(false)}
      onPointerCancel={() => setPaused(false)}
    >
      <div className="breaking-ticker__label">
        <span className="breaking-ticker__dot" aria-hidden />
        {t.common.live}
      </div>
      <div className="breaking-ticker__viewport">
        <div className="breaking-ticker__track">
          {doubled.map((item, i) => (
            <TrackedStoryLink
              key={`${item.id}-${i}`}
              href={`/story/${item.slug}`}
              aria-hidden={i >= items.length ? true : undefined}
              tabIndex={i >= items.length ? -1 : undefined}
              slug={item.slug}
              category={item.section}
              region={item.section}
              surface="breaking"
              className="breaking-ticker__item"
            >
              {item.ranking.isBreaking ? (
                <span className="breaking-ticker__tag">
                  {t.common.breakingLabel}
                </span>
              ) : null}
              <span className="breaking-ticker__headline">{item.headline}</span>
            </TrackedStoryLink>
          ))}
        </div>
      </div>
    </section>
  );
}
