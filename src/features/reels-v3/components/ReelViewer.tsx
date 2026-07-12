"use client";

import { useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import { useReelPreload } from "@/hooks/useReelPreload";
import { useReelViewport } from "@/hooks/useReelViewport";
import { useLanguage } from "@/providers/LanguageProvider";
import type { NewsShortCard } from "@/lib/news/shorts/types";
import { useReelSwipeNavigation } from "../hooks/useReelSwipeNavigation";
import { ReelCard } from "./ReelCard";
import { ReelSwipeNavigation } from "./ReelSwipeNavigation";

type ReelViewerProps = {
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

/**
 * JDP-017 — Full-screen vertical reel viewer with scroll-snap + swipe
 */
export function ReelViewer({
  shorts,
  initialSlug,
  onActiveIndexChange,
}: ReelViewerProps) {
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

  const handleNavigate = useCallback(
    (index: number) => scrollToIndex(index, "smooth"),
    [scrollToIndex]
  );

  const { onTouchStart, onTouchMove, onTouchEnd } = useReelSwipeNavigation({
    activeIndex,
    onNavigate: handleNavigate,
  });

  return (
    <>
      <header className="reels-v3-chrome">
        <Link href="/" className="reels-v3-chrome__back tap-target">
          ← {t.shorts.backHome}
        </Link>
        <div className="reels-v3-chrome__center">
          <span className="reels-v3-chrome__brand">{t.shorts.title}</span>
          <span className="reels-v3-chrome__sub">{t.shorts.subtitle}</span>
        </div>
        <span className="reels-v3-chrome__position" aria-live="polite">
          {activeIndex + 1}/{shorts.length}
        </span>
      </header>

      <ReelSwipeNavigation visible={activeIndex === 0} />

      <div
        ref={viewportRef}
        className="reels-v3-viewport"
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
              className="reels-v3-viewport__slide"
              data-reel-index={index}
            >
              {inWindow ? (
                <ReelCard
                  short={short}
                  active={isActive}
                  prewarm={prewarm}
                  onActivate={() => scrollToIndex(index, "smooth")}
                />
              ) : (
                <div
                  className="reels-v3-viewport__placeholder"
                  aria-hidden
                  style={
                    {
                      "--reels-v3-gradient":
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
