"use client";

import { TrackedStoryLink } from "@/components/analytics/TrackedStoryLink";
import { useLanguage } from "@/providers/LanguageProvider";
import type { HomeArticle } from "@/lib/homepage/types";

type BreakingTickerProps = {
  items: HomeArticle[];
  freshIds?: ReadonlySet<string>;
};

export function BreakingTicker({ items, freshIds }: BreakingTickerProps) {
  const { t } = useLanguage();
  const hasHeadlines = items.length > 0;

  return (
    <section
      className="breaking-ticker breaking-ticker--scroll pl-scroll-target"
      aria-label={t.home.tickerAria}
    >
      <div className="breaking-ticker__label">
        <span className="breaking-ticker__dot" aria-hidden />
        <span className="breaking-ticker__live-text">{t.common.live}</span>
      </div>

      <div className="breaking-ticker__viewport">
        {hasHeadlines ? (
          <div className="breaking-ticker__track" role="list">
            {items.map((item) => (
              <TrackedStoryLink
                key={item.id}
                href={`/story/${item.slug}`}
                slug={item.slug}
                category={item.section}
                region={item.section}
                surface="breaking"
                role="listitem"
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
