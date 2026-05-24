"use client";

import { memo } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { NationalNewsCard } from "@/components/home/NationalNewsCard";
import { homeArticleToQuickUpdate } from "@/lib/homepage/quick-update";
import type { NationalSegment } from "@/lib/homepage/national-filter";
import type { HomeArticle } from "@/lib/homepage/types";
import { useLanguage } from "@/providers/LanguageProvider";

type NationalHighlightsFeedProps = {
  segment: NationalSegment;
  items: HomeArticle[];
  freshIds?: ReadonlySet<string>;
};

export const NationalHighlightsFeed = memo(function NationalHighlightsFeed({
  segment,
  items,
  freshIds,
}: NationalHighlightsFeedProps) {
  const { t, language } = useLanguage();
  const reduceMotion = useReducedMotion();
  const slice = items.slice(0, 6);

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={segment}
        role="feed"
        aria-label={
          segment === "national"
            ? t.home.nationalNewsTab
            : t.home.internationalNewsTab
        }
        className="national-highlights-feed"
        initial={reduceMotion ? false : { opacity: 0, y: 10 }}
        animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
        exit={reduceMotion ? undefined : { opacity: 0, y: -6 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      >
        {slice.length === 0 ? (
          <p
            className="px-1 py-4 text-center text-[13px] text-stone-500 dark:text-stone-400"
            role="status"
          >
            {t.home.nationalSegmentEmpty}
          </p>
        ) : (
          <div className="divide-y divide-stone-200/60 dark:divide-stone-700/50">
            {slice.map((article, index) => (
              <NationalNewsCard
                key={article.id}
                {...homeArticleToQuickUpdate(article, language)}
                listPosition={index + 1}
                index={index}
                isIncoming={freshIds?.has(article.id)}
              />
            ))}
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
});
