"use client";

import { memo } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import { TrackedStoryLink } from "@/components/analytics/TrackedStoryLink";
import { useLocaleFormat } from "@/lib/i18n/hooks";
import type { QuickUpdateData } from "@/lib/homepage/quick-update";
import { useLanguage } from "@/providers/LanguageProvider";
import { cn } from "@/lib/cn";

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
    <motion.article
      className={cn(
        "group relative border-b border-stone-200/70 last:border-b-0",
        "dark:border-stone-700/55",
        isIncoming && "rounded-xl ring-1 ring-red-500/25"
      )}
      initial={reduceMotion ? false : { opacity: 0, y: 8 }}
      animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
      transition={{
        duration: 0.3,
        delay: Math.min(index * 0.035, 0.18),
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
        className="tap-target flex items-start gap-2.5 py-3 transition-colors hover:bg-stone-900/[0.03] dark:hover:bg-white/[0.04] px-1 -mx-1 rounded-lg"
        aria-label={`${headline}. ${updateLine}`}
      >
        <span
          className="mt-2 h-[calc(100%-1rem)] w-0.5 shrink-0 rounded-full bg-gradient-to-b from-red-500/80 to-red-800/30 opacity-0 transition-opacity group-hover:opacity-100"
          aria-hidden
        />

        <span className="min-w-0 flex-1">
          <span className="mb-1 flex flex-wrap items-center gap-1.5">
            {showLive ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-red-600/10 px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-red-600 dark:bg-red-500/15 dark:text-red-400">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-60" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-red-600 dark:bg-red-500" />
                </span>
                {t.common.live}
              </span>
            ) : null}
            {showBreaking ? (
              <span className="rounded-full bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-amber-700 dark:text-amber-400">
                {t.common.breakingLabel}
              </span>
            ) : null}
            {location ? (
              <span className="truncate text-[10px] font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
                {location}
              </span>
            ) : null}
            <time
              className="text-[11px] font-medium text-stone-500 dark:text-stone-400"
              dateTime={publishedAt}
            >
              {time(publishedAt)}
            </time>
          </span>

          <span
            className="block text-[15px] font-semibold leading-[1.35] tracking-tight text-stone-900 transition-colors group-hover:text-stone-950 dark:text-stone-50 dark:group-hover:text-white"
            lang={language === "hi" ? "hi" : undefined}
          >
            {headline}
          </span>

          <span className="mt-0.5 block line-clamp-1 text-[12px] leading-snug text-stone-600 dark:text-stone-400">
            {updateLine}
          </span>
        </span>

        <ChevronRight
          className="mt-1 h-4 w-4 shrink-0 text-stone-400 transition-all group-hover:translate-x-0.5 group-hover:text-red-600 dark:text-stone-500 dark:group-hover:text-red-400"
          strokeWidth={2}
          aria-hidden
        />
      </TrackedStoryLink>
    </motion.article>
  );
});
