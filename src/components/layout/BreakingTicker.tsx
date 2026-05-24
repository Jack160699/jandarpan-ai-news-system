"use client";

import type { CSSProperties } from "react";
import { useMemo, useRef, useState } from "react";
import { TrackedStoryLink } from "@/components/analytics/TrackedStoryLink";
import { useTickerMarqueeDuration } from "@/hooks/useTickerMarqueeDuration";
import { useLanguage } from "@/providers/LanguageProvider";
import type { HomeArticle } from "@/lib/homepage/types";

type BreakingTickerProps = {
  items: HomeArticle[];
  freshIds?: ReadonlySet<string>;
};

export function BreakingTicker({ items, freshIds }: BreakingTickerProps) {
  const [paused, setPaused] = useState(false);
  const { t } = useLanguage();
  const trackRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);

  const itemsKey = useMemo(
    () => items.map((item) => `${item.id}:${item.headline}`).join("|"),
    [items]
  );

  const marqueeItems = useMemo(
    () => (items.length ? [...items, ...items] : []),
    [items]
  );

  const duration = useTickerMarqueeDuration(trackRef, viewportRef, {
    itemCount: items.length,
    itemsKey,
  });

  const hasHeadlines = items.length > 0;

  const pause = () => setPaused(true);
  const resume = () => setPaused(false);

  return (
    <section
      className={`breaking-ticker breaking-ticker--premium breaking-ticker--marquee pl-scroll-target${paused ? " breaking-ticker--paused" : ""}`}
      aria-label={t.home.tickerAria}
      onPointerEnter={pause}
      onPointerLeave={resume}
      onPointerDown={pause}
      onPointerUp={resume}
      onPointerCancel={resume}
      onFocus={pause}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
          resume();
        }
      }}
    >
      <div className="breaking-ticker__label">
        <span className="breaking-ticker__dot" aria-hidden />
        <span className="breaking-ticker__live-text">{t.common.live}</span>
      </div>

      <span className="breaking-ticker__rail-divider" aria-hidden />

      <div ref={viewportRef} className="breaking-ticker__viewport">
        {hasHeadlines ? (
          <div
            ref={trackRef}
            className="breaking-ticker__track"
            style={
              {
                "--ticker-duration": `${duration}s`,
              } as CSSProperties
            }
          >
            {marqueeItems.map((item, i) => (
              <span key={`${item.id}-${i}`} className="breaking-ticker__segment">
                <TrackedStoryLink
                  href={`/story/${item.slug}`}
                  aria-hidden={i >= items.length ? true : undefined}
                  tabIndex={i >= items.length ? -1 : undefined}
                  slug={item.slug}
                  category={item.section}
                  region={item.section}
                  surface="breaking"
                  className={`breaking-ticker__item${freshIds?.has(item.id) ? " breaking-ticker__item--fresh" : ""}`}
                >
                  {item.headline}
                </TrackedStoryLink>
                <span className="breaking-ticker__sep" aria-hidden>
                  ·
                </span>
              </span>
            ))}
          </div>
        ) : (
          <p className="breaking-ticker__fallback">{t.home.tickerFallback}</p>
        )}
      </div>
    </section>
  );
}
