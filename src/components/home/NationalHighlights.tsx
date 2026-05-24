"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { NationalHighlightsFeed } from "@/components/home/NationalHighlightsFeed";
import { NationalSegmentedControl } from "@/components/home/NationalSegmentedControl";
import { Reveal } from "@/components/motion";
import {
  assignNationalSegment,
  buildNationalArticlePool,
  countArticlesByNationalSegment,
  defaultNationalSegment,
  filterArticlesByNationalSegment,
  type NationalSegment,
} from "@/lib/homepage/national-filter";
import type { GeneratedHomepageFeed, HomeArticle } from "@/lib/homepage/types";
import { useLanguage } from "@/providers/LanguageProvider";
import { cn } from "@/lib/cn";

type NationalHighlightsProps = {
  articles: HomeArticle[];
  feed?: GeneratedHomepageFeed;
  freshIds?: ReadonlySet<string>;
  embedded?: boolean;
};

export function NationalHighlights({
  articles: wireArticles,
  feed,
  freshIds,
  embedded = true,
}: NationalHighlightsProps) {
  const { t } = useLanguage();
  const reduceMotion = useReducedMotion();

  const pool = useMemo(() => {
    if (feed) return buildNationalArticlePool(feed, wireArticles);
    return wireArticles;
  }, [feed, wireArticles]);

  const counts = useMemo(() => countArticlesByNationalSegment(pool), [pool]);
  const [selected, setSelected] = useState<NationalSegment>(() =>
    defaultNationalSegment(counts)
  );
  const [feedLoading, setFeedLoading] = useState(false);

  const filtered = useMemo(
    () => filterArticlesByNationalSegment(pool, selected),
    [pool, selected]
  );

  const handleSelect = useCallback(
    (segment: NationalSegment) => {
      if (segment === selected) return;
      setFeedLoading(true);
      setSelected(segment);
      window.setTimeout(() => setFeedLoading(false), 220);
    },
    [selected]
  );

  if (!pool.length) return null;

  const activeCount = counts[selected];
  const activeLabel =
    selected === "national"
      ? t.home.nationalNewsTab
      : t.home.internationalNewsTab;

  return (
    <Reveal
      as="section"
      id={embedded ? "global-brief" : "wire"}
      className={cn(
        "scroll-mt-24 w-full min-w-0",
        embedded && "global-brief-panel"
      )}
      aria-labelledby="global-brief-title"
    >
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2
          id="global-brief-title"
          className="m-0 font-[family-name:var(--font-hindi,var(--font-display))] text-[clamp(1.125rem,4.2vw,1.3125rem)] font-bold leading-tight tracking-tight text-stone-900 dark:text-stone-50"
        >
          {t.home.globalBrief}
        </h2>
        <motion.div whileHover={reduceMotion ? undefined : { x: 2 }}>
          <Link
            href="/live"
            className="tap-target group inline-flex shrink-0 items-center gap-1 text-[13px] font-bold text-[#a01830] no-underline dark:text-red-400"
          >
            {t.home.allUpdates}
            <ArrowRight
              className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
              strokeWidth={2.5}
              aria-hidden
            />
          </Link>
        </motion.div>
      </div>

      <div
        className={cn(
          "space-y-3 rounded-[20px] border p-3",
          "border-stone-200/80 bg-stone-100/40 backdrop-blur-md",
          "dark:border-stone-700/50 dark:bg-stone-950/60 dark:shadow-[0_8px_32px_rgba(0,0,0,0.4)]"
        )}
      >
        <NationalSegmentedControl
          selected={selected}
          counts={counts}
          onSelect={handleSelect}
        />

        <motion.div
          key={`${selected}-bar`}
          initial={reduceMotion ? false : { opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 border-t border-stone-200/70 pt-2 dark:border-stone-700/50"
          role="status"
        >
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-[#ff0000] shadow-[0_0_8px_rgba(255,0,0,0.5)]" />
          </span>
          <p className="min-w-0 truncate text-[12px] font-semibold text-stone-700 dark:text-stone-200">
            <span className="font-extrabold uppercase text-[#c40000] dark:text-red-400">
              {t.home.districtLivePrefix}:
            </span>{" "}
            {activeLabel}
          </p>
          <span className="h-3 w-px shrink-0 bg-stone-300 dark:bg-stone-600" aria-hidden />
          <p className="shrink-0 text-[11px] font-medium text-stone-500 dark:text-stone-400">
            <span className="font-bold text-stone-800 dark:text-stone-100">
              {activeCount}
            </span>{" "}
            {t.home.districtLiveStoriesLabel}
          </p>
        </motion.div>

        <div
          className={cn(
            "rounded-2xl border px-2 py-0.5 transition-opacity duration-200",
            "border-stone-200/60 bg-white/70 dark:border-stone-800/80 dark:bg-stone-900/50",
            feedLoading && "opacity-70"
          )}
        >
          <NationalHighlightsFeed
            segment={selected}
            items={filtered}
            freshIds={freshIds}
          />
        </div>
      </div>
    </Reveal>
  );
}
