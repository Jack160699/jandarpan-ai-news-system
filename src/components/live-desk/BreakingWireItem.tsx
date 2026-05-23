"use client";

import { memo, type CSSProperties } from "react";
import { TrackedStoryLink } from "@/components/analytics/TrackedStoryLink";
import { useLocaleFormat } from "@/lib/i18n/hooks";
import { useLanguage } from "@/providers/LanguageProvider";
import { resolveWireLocation } from "@/lib/homepage/wire-location";
import type { HomeArticle } from "@/lib/homepage/types";

type BreakingWireItemProps = {
  article: HomeArticle;
  listPosition?: number;
  index?: number;
};

function isFresh(article: HomeArticle): boolean {
  const hours =
    (Date.now() - new Date(article.publishedAt).getTime()) / 3_600_000;
  return hours < 2;
}

export const BreakingWireItem = memo(function BreakingWireItem({
  article,
  listPosition,
  index = 0,
}: BreakingWireItemProps) {
  const { t } = useLanguage();
  const { time } = useLocaleFormat();
  const location = resolveWireLocation(article);
  const fresh = isFresh(article);
  const isLive = article.isLive;
  const isBreaking =
    article.ranking.isBreaking || article.urgency === "high" || fresh;

  return (
    <article
      className={`bwire-item${isLive ? " bwire-item--live" : ""}${isBreaking ? " bwire-item--breaking" : ""}`}
      style={{ "--bwire-i": index } as CSSProperties}
    >
      <TrackedStoryLink
        href={`/story/${article.slug}`}
        slug={article.slug}
        category={article.section}
        region={article.section}
        surface="homepage"
        listPosition={listPosition}
        className="bwire-item__link tap-press"
      >
        <span className="bwire-item__rail" aria-hidden>
          <span className="bwire-item__pulse" />
        </span>

        <span className="bwire-item__body">
          <span className="bwire-item__meta">
            {isBreaking ? (
              <span className="bwire-item__badge bwire-item__badge--breaking">
                {t.common.breakingLabel.toUpperCase()}
              </span>
            ) : null}
            {isLive ? (
              <span className="bwire-item__badge bwire-item__badge--live">
                <span className="bwire-item__live-dot" aria-hidden />
                {t.common.live}
              </span>
            ) : null}
            <time
              className="bwire-item__time"
              dateTime={article.publishedAt}
            >
              {time(article.publishedAt)}
            </time>
            <span className="bwire-item__sep" aria-hidden>
              ·
            </span>
            <span className="bwire-item__loc">{location}</span>
          </span>

          <span
            className="bwire-item__headline"
            lang={article.language === "hi" ? "hi" : undefined}
          >
            {article.headline}
          </span>
        </span>
      </TrackedStoryLink>
    </article>
  );
});
