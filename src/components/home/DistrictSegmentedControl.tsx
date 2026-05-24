"use client";

import { memo, useCallback, useRef } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/cn";
import {
  FEATURED_DISTRICT_SLUGS,
  getFeaturedDistrict,
  type FeaturedDistrictSlug,
} from "@/lib/homepage/district-filter";
import { useLanguage } from "@/providers/LanguageProvider";

const DISTRICT_TINT: Record<
  FeaturedDistrictSlug,
  { light: string; dark: string; icon: string }
> = {
  bilaspur: {
    light: "bg-amber-100 text-amber-800 ring-amber-200/80",
    dark: "dark:bg-amber-950/60 dark:text-amber-200 dark:ring-amber-800/50",
    icon: "B",
  },
  raipur: {
    light: "bg-sky-100 text-sky-800 ring-sky-200/80",
    dark: "dark:bg-sky-950/60 dark:text-sky-200 dark:ring-sky-800/50",
    icon: "R",
  },
  durg: {
    light: "bg-emerald-100 text-emerald-800 ring-emerald-200/80",
    dark: "dark:bg-emerald-950/60 dark:text-emerald-200 dark:ring-emerald-800/50",
    icon: "D",
  },
  rajnandgaon: {
    light: "bg-violet-100 text-violet-800 ring-violet-200/80",
    dark: "dark:bg-violet-950/60 dark:text-violet-200 dark:ring-violet-800/50",
    icon: "Rg",
  },
};

type DistrictSegmentedControlProps = {
  selected: FeaturedDistrictSlug;
  counts: Record<FeaturedDistrictSlug, number>;
  onSelect: (slug: FeaturedDistrictSlug) => void;
};

export const DistrictSegmentedControl = memo(function DistrictSegmentedControl({
  selected,
  counts,
  onSelect,
}: DistrictSegmentedControlProps) {
  const { t, language } = useLanguage();
  const reduceMotion = useReducedMotion();
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollActiveIntoView = useCallback((slug: FeaturedDistrictSlug) => {
    const root = scrollRef.current;
    if (!root) return;
    const btn = root.querySelector<HTMLButtonElement>(
      `[data-district-segment="${slug}"]`
    );
    btn?.scrollIntoView({
      behavior: reduceMotion ? "auto" : "smooth",
      block: "nearest",
      inline: "center",
    });
  }, [reduceMotion]);

  const handleSelect = (slug: FeaturedDistrictSlug) => {
    onSelect(slug);
    requestAnimationFrame(() => scrollActiveIntoView(slug));
  };

  const activeDistrict = getFeaturedDistrict(selected);
  const activeLabel =
    language === "en"
      ? activeDistrict.name
      : t.home.featuredDistricts[selected] || activeDistrict.nameHi;
  const activeCount = counts[selected];

  return (
    <div className="w-full min-w-0 space-y-2">
      <div
        ref={scrollRef}
        className={cn(
          "w-full min-w-0 overflow-x-auto overscroll-x-contain",
          "[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
        )}
      >
        <div
          role="tablist"
          aria-label={t.home.districtHighlights}
          className={cn(
            "relative inline-flex w-max min-w-full gap-0 rounded-[18px] p-1",
            "border border-stone-200/90 bg-stone-100/75 shadow-[0_2px_14px_rgba(28,20,16,0.06)]",
            "backdrop-blur-md backdrop-saturate-150",
            "dark:border-stone-600/50 dark:bg-stone-900/55 dark:shadow-[0_4px_24px_rgba(0,0,0,0.35)]"
          )}
        >
          {FEATURED_DISTRICT_SLUGS.map((slug, index) => {
            const district = getFeaturedDistrict(slug);
            const label =
              language === "en"
                ? district.name
                : t.home.featuredDistricts[slug] || district.nameHi;
            const isActive = selected === slug;
            const tint = DISTRICT_TINT[slug];
            const isFirst = index === 0;
            const isLast = index === FEATURED_DISTRICT_SLUGS.length - 1;

            return (
              <motion.button
                key={slug}
                type="button"
                role="tab"
                data-district-segment={slug}
                aria-selected={isActive}
                onClick={() => handleSelect(slug)}
                whileHover={
                  reduceMotion || isActive ? undefined : { y: -1, scale: 1.01 }
                }
                whileTap={reduceMotion ? undefined : { scale: 0.98 }}
                className={cn(
                  "tap-target relative z-10 flex min-h-[42px] min-w-[5.5rem] flex-1 shrink-0 items-center justify-center gap-1.5",
                  "px-2.5 py-2 font-medium transition-colors duration-200",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/40 focus-visible:ring-offset-1",
                  isFirst && "rounded-l-[14px]",
                  isLast && "rounded-r-[14px]",
                  !isActive &&
                    "text-stone-700 hover:bg-white/50 dark:text-stone-200 dark:hover:bg-white/5"
                )}
              >
                {isActive ? (
                  <motion.div
                    layoutId="district-segment-active"
                    className={cn(
                      "absolute inset-0 z-0 rounded-[14px]",
                      "bg-gradient-to-b from-[#ff0000] to-[#b30000]",
                      "shadow-[0_4px_18px_rgba(179,0,0,0.45),0_0_0_1px_rgba(255,255,255,0.12)_inset]"
                    )}
                    transition={
                      reduceMotion
                        ? { duration: 0 }
                        : { type: "spring", stiffness: 420, damping: 34 }
                    }
                  >
                    <span
                      className="absolute -bottom-[5px] left-1/2 z-20 h-0 w-0 -translate-x-1/2"
                      aria-hidden
                    >
                      <span className="block h-0 w-0 border-x-[5px] border-t-[5px] border-x-transparent border-t-[#b30000]" />
                    </span>
                  </motion.div>
                ) : null}

                <span
                  className={cn(
                    "relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ring-1",
                    isActive
                      ? "bg-white/20 text-white ring-white/30"
                      : cn(tint.light, tint.dark)
                  )}
                  aria-hidden
                >
                  {tint.icon}
                </span>

                <span
                  className={cn(
                    "relative z-10 truncate text-[13px] leading-tight tracking-tight",
                    isActive ? "font-semibold text-white" : "font-medium"
                  )}
                >
                  {label}
                </span>

                {isActive ? (
                  <motion.span
                    initial={reduceMotion ? false : { opacity: 0, scale: 0.85 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="relative z-10 flex items-center gap-1 rounded-full bg-white/15 px-1.5 py-0.5"
                  >
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-60" />
                      <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-white" />
                    </span>
                    <span className="text-[9px] font-extrabold uppercase tracking-wider text-white">
                      {t.home.districtLive}
                    </span>
                  </motion.span>
                ) : null}
              </motion.button>
            );
          })}
        </div>
      </div>

      <DistrictLiveInfoBar
        districtLabel={activeLabel}
        storyCount={activeCount}
        livePrefix={t.home.districtLivePrefix}
        storiesLabel={t.home.districtLiveStoriesLabel}
      />
    </div>
  );
});

type DistrictLiveInfoBarProps = {
  districtLabel: string;
  storyCount: number;
  livePrefix: string;
  storiesLabel: string;
};

function DistrictLiveInfoBar({
  districtLabel,
  storyCount,
  livePrefix,
  storiesLabel,
}: DistrictLiveInfoBarProps) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      key={districtLabel}
      initial={reduceMotion ? false : { opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "flex min-h-[34px] items-center gap-2 border-t border-stone-200/80 px-0.5 pt-2",
        "dark:border-stone-600/45"
      )}
      role="status"
      aria-live="polite"
    >
      <span className="relative flex h-2 w-2 shrink-0">
        {!reduceMotion ? (
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-70" />
        ) : null}
        <span className="relative inline-flex h-2 w-2 rounded-full bg-[#ff0000] shadow-[0_0_8px_rgba(255,0,0,0.55)]" />
      </span>

      <p className="min-w-0 truncate text-[12px] font-semibold tracking-tight text-stone-800 dark:text-stone-100">
        <span className="font-extrabold uppercase text-[#c40000] dark:text-red-400">
          {livePrefix}:
        </span>{" "}
        <span>{districtLabel}</span>
      </p>

      <span
        className="h-3 w-px shrink-0 bg-stone-300 dark:bg-stone-600"
        aria-hidden
      />

      <p className="shrink-0 text-[11px] font-medium text-stone-500 dark:text-stone-400">
        <span className="font-bold text-stone-700 dark:text-stone-200">
          {storyCount}
        </span>{" "}
        {storiesLabel}
      </p>
    </motion.div>
  );
}
