"use client";

import { TrackedStoryLink } from "@/components/analytics/TrackedStoryLink";
import type { HomeArticle } from "@/lib/homepage/types";

type BreakingTickerProps = {
  items: HomeArticle[];
};

export function BreakingTicker({ items }: BreakingTickerProps) {
  if (!items.length) return null;

  const doubled = [...items, ...items];

  return (
    <section
      className="nr-ticker"
      aria-label="Breaking news headlines"
      role="region"
    >
      <div className="nr-ticker__label" aria-hidden>
        <span className="nr-ticker__dot" />
        Breaking
      </div>
      <div className="nr-ticker__viewport">
        <div className="nr-ticker__track">
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
              className="nr-ticker__item"
            >
              {item.headline}
            </TrackedStoryLink>
          ))}
        </div>
      </div>
    </section>
  );
}
