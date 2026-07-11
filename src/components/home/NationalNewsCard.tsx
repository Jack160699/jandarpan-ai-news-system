"use client";

import { memo, type CSSProperties } from "react";
import { ChevronRight } from "lucide-react";
import { TrackedStoryLink } from "@/components/analytics/TrackedStoryLink";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useLocaleFormat } from "@/lib/i18n/hooks";
import type { QuickUpdateData } from "@/lib/homepage/quick-update";
import { useLanguage } from "@/providers/LanguageProvider";

export type NationalNewsCardProps = QuickUpdateData & {
  listPosition?: number;
  index?: number;
  isIncoming?: boolean;
};

export const NationalNewsCard = memo(function NationalNewsCard({
  slug,
  section,
  headline,
  updateLine,
  publishedAt,
  language,
  isLive,
  isBreaking,
  location,
  listPosition,
  index = 0,
  isIncoming = false,
}: NationalNewsCardProps) {
  const { t } = useLanguage();
  const { time } = useLocaleFormat();
  const reduceMotion = useReducedMotion();
  const showLive = isLive;
  const showBreaking = isBreaking && !showLive;

  return (
    <article
      className={`quick-update quick-update--feed quick-update--national${showLive ? " quick-update--live" : ""}${showBreaking ? " quick-update--breaking" : ""}${isIncoming ? " quick-update--incoming" : ""}${!reduceMotion ? " quick-update--enter" : ""}`}
      style={{ "--ncard-i": index } as CSSProperties}
    >
      <TrackedStoryLink
        href={`/story/${slug}`}
        slug={slug}
        category={section}
        region={section}
        surface="homepage"
        listPosition={listPosition}
        className="quick-update__link tap-target"
        aria-label={`${headline}. ${updateLine}`}
      >
        <span className="quick-update__accent" aria-hidden />

        <span className="quick-update__content">
          <span className="quick-update__meta">
            {showLive ? (
              <span className="quick-update__badge quick-update__badge--live">
                <span className="quick-update__live-dot" aria-hidden />
                {t.common.live}
              </span>
            ) : null}
            {showBreaking ? (
              <span className="quick-update__badge quick-update__badge--breaking">
                {t.common.breakingLabel}
              </span>
            ) : null}
            {location ? (
              <span className="quick-update__location">{location}</span>
            ) : null}
            <time className="quick-update__time" dateTime={publishedAt}>
              {time(publishedAt)}
            </time>
          </span>

          <span
            className="quick-update__headline hi"
            lang={language === "hi" ? "hi" : undefined}
          >
            {headline}
          </span>

          <span className="quick-update__line">{updateLine}</span>
        </span>

        <ChevronRight
          className="quick-update__chevron"
          strokeWidth={2}
          aria-hidden
        />
      </TrackedStoryLink>
    </article>
  );
});
