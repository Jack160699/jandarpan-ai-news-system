"use client";

import { useState } from "react";
import { TrackedStoryLink } from "@/components/analytics/TrackedStoryLink";
import { useLanguage } from "@/providers/LanguageProvider";
import type { HomeArticle } from "@/lib/homepage/types";

type BreakingTickerProps = {
  items: HomeArticle[];
  sticky?: boolean;
  freshIds?: ReadonlySet<string>;
};

export function BreakingTicker({
  items,
  sticky = true,
  freshIds,
}: BreakingTickerProps) {
  const [paused, setPaused] = useState(false);
  const { t } = useLanguage();

  if (!items.length) return null;

  const doubled = [...items, ...items];
  const hasLive = items.some((i) => i.isLive || i.ranking.isBreaking);

  return (
    <section
      className={`nr-ticker nr-ticker--live${sticky ? " newsroom-sticky newsroom-sticky--ticker" : ""}${paused ? " nr-ticker--paused" : ""}`}
      aria-label={t.home.tickerAria}
      role="region"
      onPointerDown={() => setPaused(true)}
      onPointerUp={() => setPaused(false)}
      onPointerLeave={() => setPaused(false)}
      onPointerCancel={() => setPaused(false)}
    >
      <div className="nr-ticker__brand">
        <span className="nr-ticker__live-pill">
          <span className="nr-ticker__live-dot" aria-hidden />
          {t.common.live}
        </span>
        <span className="nr-ticker__label-text">{t.common.breaking}</span>
      </div>

      <div className="nr-ticker__viewport">
        <div
          className="nr-ticker__track"
          style={{ "--ticker-items": items.length } as React.CSSProperties}
        >
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
              className={`nr-ticker__item${freshIds?.has(item.id) ? " nr-ticker__item--fresh" : ""}`}
            >
              {item.ranking.isBreaking ? (
                <span className="nr-ticker__tag">{t.common.breakingLabel}</span>
              ) : null}
              <span className="nr-ticker__headline">{item.headline}</span>
            </TrackedStoryLink>
          ))}
        </div>
      </div>

      {hasLive ? (
        <span className="nr-ticker__edge-glow" aria-hidden />
      ) : null}
    </section>
  );
}
