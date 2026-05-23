"use client";

import { useCallback, useEffect, useRef } from "react";
import { ReelItem } from "@/components/shorts/ReelItem";
import { ReelSwipeHint } from "@/components/shorts/ReelSwipeHint";
import { useReelPreload } from "@/hooks/useReelPreload";
import { useReelViewport } from "@/hooks/useReelViewport";
import { useLanguage } from "@/providers/LanguageProvider";
import type { NewsShortCard } from "@/lib/news/shorts/types";

type ShortsVerticalFeedProps = {
  shorts: NewsShortCard[];
  initialSlug?: string;
  onActiveIndexChange?: (index: number) => void;
};

const LAZY_WINDOW = 2;

function hapticSnap() {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    navigator.vibrate(4);
  }
}

export function ShortsVerticalFeed({
  shorts,
  initialSlug,
  onActiveIndexChange,
}: ShortsVerticalFeedProps) {
  const { t } = useLanguage();
  const initialIndex = initialSlug
    ? Math.max(0, shorts.findIndex((s) => s.slug === initialSlug))
    : 0;

  const { viewportRef, activeIndex, scrollToIndex } = useReelViewport({
    itemCount: shorts.length,
    initialIndex,
  });

  const prevIndexRef = useRef(activeIndex);
  useReelPreload(shorts, activeIndex);

  useEffect(() => {
    if (prevIndexRef.current !== activeIndex) {
      hapticSnap();
      prevIndexRef.current = activeIndex;
    }
    onActiveIndexChange?.(activeIndex);
  }, [activeIndex, onActiveIndexChange]);

  const touchStartY = useRef(0);
  const touchDeltaY = useRef(0);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartY.current = e.touches[0]?.clientY ?? 0;
    touchDeltaY.current = 0;
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    const y = e.touches[0]?.clientY ?? 0;
    touchDeltaY.current = touchStartY.current - y;
  }, []);

  const onTouchEnd = useCallback(() => {
    const delta = touchDeltaY.current;
    if (Math.abs(delta) < 48) return;
    if (delta > 0) scrollToIndex(activeIndex + 1);
    else scrollToIndex(activeIndex - 1);
  }, [activeIndex, scrollToIndex]);

  if (!shorts.length) {
    return <p className="reels-empty">{t.shorts.empty}</p>;
  }

  return (
    <>
      <ReelSwipeHint />
      <div
        ref={viewportRef}
        className="reels-viewport reels-viewport--premium"
        role="feed"
        aria-label={t.shorts.feedAria}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {shorts.map((short, index) => {
          const inWindow =
            index >= activeIndex - LAZY_WINDOW &&
            index <= activeIndex + LAZY_WINDOW;
          const isActive = activeIndex === index;
          const prewarm =
            index === activeIndex - 1 || index === activeIndex + 1;

          return (
            <div
              key={short.articleId}
              className="reels-viewport__slide"
              data-reel-index={index}
            >
              {inWindow ? (
                <ReelItem
                  short={short}
                  active={isActive}
                  prewarm={prewarm}
                  variant="full"
                  onActivate={() => scrollToIndex(index, "smooth")}
                />
              ) : (
                <div
                  className="reels-viewport__placeholder"
                  aria-hidden
                  style={
                    {
                      "--short-gradient":
                        "linear-gradient(165deg,#1c1917,#0f172a)",
                    } as React.CSSProperties
                  }
                />
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
