"use client";

import { memo, type CSSProperties } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import { TrackedStoryLink } from "@/components/analytics/TrackedStoryLink";
import { useLocaleFormat } from "@/lib/i18n/hooks";
import type { QuickUpdateData } from "@/lib/homepage/quick-update";
import { useLanguage } from "@/providers/LanguageProvider";

export type QuickUpdateCardProps = QuickUpdateData & {
  listPosition?: number;
  index?: number;
  variant?: "feed" | "rail";
  isIncoming?: boolean;
};

export const QuickUpdateCard = memo(function QuickUpdateCard({
  slug,
  section,
  headline,
  updateLine,
  publishedAt,
  language,
  isLive,
  isBreaking,
  listPosition,
  index = 0,
  variant = "feed",
  isIncoming = false,
}: QuickUpdateCardProps) {
  const { t } = useLanguage();
  const { time } = useLocaleFormat();
  const reduceMotion = useReducedMotion();

  const showLive = isLive;
  const showBreaking = isBreaking && !showLive;

  return (
    <motion.article
      className={`quick-update quick-update--${variant}${showLive ? " quick-update--live" : ""}${showBreaking ? " quick-update--breaking" : ""}${isIncoming ? " quick-update--incoming" : ""}`}
      style={{ "--qu-i": index } as CSSProperties}
      initial={reduceMotion ? false : { opacity: 0, y: 6 }}
      animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
      transition={{
        duration: 0.34,
        delay: Math.min(index * 0.04, 0.2),
        ease: [0.22, 1, 0.36, 1],
      }}
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
            <time className="quick-update__time" dateTime={publishedAt}>
              {time(publishedAt)}
            </time>
          </span>

          <span
            className="quick-update__headline"
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
    </motion.article>
  );
});
