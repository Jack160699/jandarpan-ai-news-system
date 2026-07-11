"use client";

import { useCallback, useRef } from "react";

const SWIPE_THRESHOLD_PX = 48;

type UseReelSwipeNavigationOptions = {
  activeIndex: number;
  onNavigate: (index: number) => void;
};

export function useReelSwipeNavigation({
  activeIndex,
  onNavigate,
}: UseReelSwipeNavigationOptions) {
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
    if (Math.abs(delta) < SWIPE_THRESHOLD_PX) return;
    if (delta > 0) onNavigate(activeIndex + 1);
    else onNavigate(activeIndex - 1);
  }, [activeIndex, onNavigate]);

  return { onTouchStart, onTouchMove, onTouchEnd };
}
