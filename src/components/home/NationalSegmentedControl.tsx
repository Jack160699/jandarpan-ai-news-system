"use client";

import { memo } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/cn";
import {
  NATIONAL_SEGMENTS,
  type NationalSegment,
} from "@/lib/homepage/national-filter";
import { useLanguage } from "@/providers/LanguageProvider";

type NationalSegmentedControlProps = {
  selected: NationalSegment;
  counts: Record<NationalSegment, number>;
  onSelect: (segment: NationalSegment) => void;
};

const SEGMENT_LABEL_KEY: Record<
  NationalSegment,
  "nationalNewsTab" | "internationalNewsTab"
> = {
  national: "nationalNewsTab",
  international: "internationalNewsTab",
};

export const NationalSegmentedControl = memo(function NationalSegmentedControl({
  selected,
  counts,
  onSelect,
}: NationalSegmentedControlProps) {
  const { t } = useLanguage();
  const reduceMotion = useReducedMotion();

  return (
    <div
      role="tablist"
      aria-label={t.home.nationalHighlights}
      className={cn(
        "relative flex w-full gap-0 rounded-[18px] p-1",
        "border border-red-900/20 bg-stone-900/90 shadow-[0_4px_24px_rgba(0,0,0,0.35)]",
        "backdrop-blur-xl backdrop-saturate-150",
        "dark:border-red-500/15 dark:bg-stone-950/85"
      )}
    >
      {NATIONAL_SEGMENTS.map((segment, index) => {
        const isActive = selected === segment;
        const isFirst = index === 0;
        const isLast = index === NATIONAL_SEGMENTS.length - 1;
        const label = t.home[SEGMENT_LABEL_KEY[segment]];
        const count = counts[segment];

        return (
          <motion.button
            key={segment}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onSelect(segment)}
            whileHover={
              reduceMotion || isActive ? undefined : { y: -1, scale: 1.01 }
            }
            whileTap={reduceMotion ? undefined : { scale: 0.98 }}
            className={cn(
              "tap-target relative z-10 flex min-h-[44px] flex-1 items-center justify-center gap-2",
              "px-3 py-2.5 transition-colors duration-200",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-stone-900",
              isFirst && "rounded-l-[14px]",
              isLast && "rounded-r-[14px]",
              !isActive &&
                "border border-transparent text-stone-400 hover:border-red-500/25 hover:bg-white/5 hover:text-stone-200"
            )}
          >
            {isActive ? (
              <motion.div
                layoutId="national-segment-active"
                className={cn(
                  "absolute inset-0 z-0 rounded-[14px]",
                  "bg-gradient-to-b from-[#ff0000] to-[#b30000]",
                  "shadow-[0_4px_20px_rgba(179,0,0,0.5),0_0_0_1px_rgba(255,255,255,0.1)_inset]"
                )}
                transition={
                  reduceMotion
                    ? { duration: 0 }
                    : { type: "spring", stiffness: 420, damping: 34 }
                }
              />
            ) : null}

            <span
              className={cn(
                "relative z-10 text-[13px] font-semibold tracking-tight",
                isActive ? "text-white" : "font-medium"
              )}
            >
              {label}
            </span>

            {isActive ? (
              <motion.span
                initial={reduceMotion ? false : { opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative z-10 flex items-center gap-1"
                aria-hidden
              >
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-50" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-white" />
                </span>
              </motion.span>
            ) : count > 0 ? (
              <span
                className="relative z-10 rounded-full bg-stone-800/80 px-1.5 py-0.5 text-[10px] font-bold text-stone-400"
                aria-hidden
              >
                {count}
              </span>
            ) : null}
          </motion.button>
        );
      })}
    </div>
  );
});
