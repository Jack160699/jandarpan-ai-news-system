"use client";

import { useEffect, useRef } from "react";
import { gsap } from "@/lib/gsap";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useEditorialIntelligenceOptional } from "@/providers/EditorialIntelligenceProvider";

const TICKER_MORNING =
  "नया रायपुर: फाइल गायब · Raipur civic update at 10 AM · Durg school inspection postponed · Bastar health camp route extended · Assembly item nine deferred ·";

const TICKER_EVENING =
  "Evening filing: Naya Raipur register restored online · Bhilai night shift notice · Youth league final replay at 8 · Water ward charts updated ·";

export function BreakingNews() {
  const trackRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const ctx = useEditorialIntelligenceOptional();
  const ticker =
    ctx?.live.phase === "evening" || ctx?.live.phase === "night"
      ? TICKER_EVENING
      : TICKER_MORNING;

  useEffect(() => {
    if (reduced || !trackRef.current) return;
    const tween = gsap.to(trackRef.current, {
      xPercent: -50,
      ease: "none",
      duration: 32,
      repeat: -1,
    });
    return () => {
      tween.kill();
    };
  }, [reduced, ticker]);

  return (
    <section
      id="breaking"
      className="relative z-10 border-b border-[var(--rule)] bg-[var(--accent-breaking)] text-[#faf6f0]"
      aria-label="Breaking news"
    >
      <div className="editorial-container flex items-stretch gap-3 py-3 md:gap-5 md:py-3.5">
        <SectionLabel
          variant="breaking"
          className="shrink-0 self-center !text-[#faf6f0]/95"
        >
          ताज़ा · Breaking
        </SectionLabel>
        <div className="relative flex-1 overflow-hidden">
          <div ref={trackRef} className="flex w-max gap-10 whitespace-nowrap md:gap-14">
            <span
              className="text-sm tracking-wide text-[#faf6f0]/95 md:text-[0.8125rem]"
              style={{ fontFamily: "var(--font-meta)" }}
            >
              {ticker}
            </span>
            <span
              className="text-sm tracking-wide text-[#faf6f0]/95 md:text-[0.8125rem]"
              aria-hidden
              style={{ fontFamily: "var(--font-meta)" }}
            >
              {ticker}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
