"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ReelItem } from "@/components/shorts/ReelItem";
import type { NewsShortCard } from "@/lib/news/shorts/types";

type ShortsVerticalFeedProps = {
  shorts: NewsShortCard[];
  initialSlug?: string;
};

const LAZY_WINDOW = 2;

export function ShortsVerticalFeed({
  shorts,
  initialSlug,
}: ShortsVerticalFeedProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const initialIndex = initialSlug
    ? Math.max(
        0,
        shorts.findIndex((s) => s.slug === initialSlug)
      )
    : 0;

  const [activeIndex, setActiveIndex] = useState(initialIndex);

  const setActiveFromScroll = useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const slides = viewport.querySelectorAll<HTMLElement>("[data-reel-index]");
    const mid = viewport.scrollTop + viewport.clientHeight * 0.45;

    let closest = 0;
    let minDist = Infinity;
    slides.forEach((el) => {
      const idx = Number(el.dataset.reelIndex ?? 0);
      const dist = Math.abs(el.offsetTop - mid);
      if (dist < minDist) {
        minDist = dist;
        closest = idx;
      }
    });
    setActiveIndex(closest);
  }, []);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport || initialIndex <= 0) return;

    const target = viewport.querySelector<HTMLElement>(
      `[data-reel-index="${initialIndex}"]`
    );
    target?.scrollIntoView({ behavior: "instant" });
    setActiveIndex(initialIndex);
  }, [initialIndex]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        setActiveFromScroll();
        ticking = false;
      });
    };

    viewport.addEventListener("scroll", onScroll, { passive: true });
    return () => viewport.removeEventListener("scroll", onScroll);
  }, [setActiveFromScroll]);

  if (!shorts.length) {
    return (
      <p className="reels-empty">
        अभी कोई शॉर्ट उपलब्ध नहीं। संपादकीय डेस्क से जल्द अपडेट।
      </p>
    );
  }

  return (
    <div
      ref={viewportRef}
      className="reels-viewport"
      role="feed"
      aria-label="Vertical news reels"
    >
      {shorts.map((short, index) => {
        const inWindow =
          index >= activeIndex - LAZY_WINDOW &&
          index <= activeIndex + LAZY_WINDOW;

        return (
          <div
            key={short.articleId}
            className="reels-viewport__slide"
            data-reel-index={index}
          >
            {inWindow ? (
              <ReelItem
                short={short}
                active={activeIndex === index}
                variant="full"
                onActivate={() => setActiveIndex(index)}
              />
            ) : (
              <div
                className="reels-viewport__placeholder"
                aria-hidden
                style={
                  {
                    "--short-gradient": "linear-gradient(165deg,#1a1a1a,#0f172a)",
                  } as React.CSSProperties
                }
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
