"use client";

import { useEffect, useMemo, useState } from "react";
import { TrackedStoryLink } from "@/components/analytics/TrackedStoryLink";
import { useLanguage } from "@/providers/LanguageProvider";
import type { HomeArticle } from "@/lib/homepage/types";

const ROTATE_MS = 4000;

type BreakingTickerProps = {
  items: HomeArticle[];
  freshIds?: ReadonlySet<string>;
};

export function BreakingTicker({ items, freshIds }: BreakingTickerProps) {
  const [paused, setPaused] = useState(false);
  const [index, setIndex] = useState(0);
  const { t } = useLanguage();

  const itemsKey = useMemo(
    () => items.map((item) => item.id).join("|"),
    [items]
  );

  useEffect(() => {
    setIndex(0);
  }, [itemsKey]);

  useEffect(() => {
    if (paused || items.length <= 1) return;
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % items.length);
    }, ROTATE_MS);
    return () => window.clearInterval(timer);
  }, [paused, items.length, itemsKey]);

  const current = items[index];
  const hasHeadlines = items.length > 0;

  return (
    <section
      className={`breaking-ticker breaking-ticker--premium breaking-ticker--rotate pl-scroll-target${paused ? " breaking-ticker--paused" : ""}`}
      aria-label={t.home.tickerAria}
      aria-live="polite"
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
          setPaused(false);
        }
      }}
    >
      <div className="breaking-ticker__label">
        <span className="breaking-ticker__dot" aria-hidden />
        {t.common.live}
      </div>

      <div className="breaking-ticker__content">
        <span className="breaking-ticker__prefix">{t.common.breakingLabel}:</span>
        <div className="breaking-ticker__headline-slot">
          {hasHeadlines && current ? (
            <TrackedStoryLink
              key={`${current.id}-${index}`}
              href={`/story/${current.slug}`}
              slug={current.slug}
              category={current.section}
              region={current.section}
              surface="breaking"
              className={`breaking-ticker__headline breaking-ticker__headline--active${freshIds?.has(current.id) ? " breaking-ticker__headline--fresh" : ""}`}
            >
              {current.headline}
            </TrackedStoryLink>
          ) : (
            <span
              key="fallback"
              className="breaking-ticker__headline breaking-ticker__headline--fallback breaking-ticker__headline--active"
            >
              {t.home.tickerFallback}
            </span>
          )}
        </div>
      </div>
    </section>
  );
}
