"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type UseReelViewportOptions = {
  itemCount: number;
  initialIndex?: number;
};

export function useReelViewport({
  itemCount,
  initialIndex = 0,
}: UseReelViewportOptions) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(
    Math.min(Math.max(0, initialIndex), Math.max(0, itemCount - 1))
  );

  const scrollToIndex = useCallback(
    (index: number, behavior: ScrollBehavior = "smooth") => {
      const viewport = viewportRef.current;
      if (!viewport || itemCount === 0) return;
      const clamped = Math.min(Math.max(0, index), itemCount - 1);
      const target = viewport.querySelector<HTMLElement>(
        `[data-reel-index="${clamped}"]`
      );
      target?.scrollIntoView({ behavior, block: "start" });
      setActiveIndex(clamped);
    },
    [itemCount]
  );

  const resolveActiveFromScroll = useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const slides = viewport.querySelectorAll<HTMLElement>("[data-reel-index]");
    const mid = viewport.scrollTop + viewport.clientHeight * 0.5;

    let closest = 0;
    let minDist = Infinity;
    slides.forEach((el) => {
      const idx = Number(el.dataset.reelIndex ?? 0);
      const dist = Math.abs(el.offsetTop + el.clientHeight * 0.5 - mid);
      if (dist < minDist) {
        minDist = dist;
        closest = idx;
      }
    });

    setActiveIndex((prev) => (prev === closest ? prev : closest));
  }, []);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport || initialIndex <= 0) return;

    const target = viewport.querySelector<HTMLElement>(
      `[data-reel-index="${initialIndex}"]`
    );
    target?.scrollIntoView({ behavior: "instant", block: "start" });
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
        resolveActiveFromScroll();
        ticking = false;
      });
    };

    viewport.addEventListener("scroll", onScroll, { passive: true });
    return () => viewport.removeEventListener("scroll", onScroll);
  }, [resolveActiveFromScroll]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown" || e.key === "j") {
        e.preventDefault();
        scrollToIndex(activeIndex + 1);
      } else if (e.key === "ArrowUp" || e.key === "k") {
        e.preventDefault();
        scrollToIndex(activeIndex - 1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeIndex, scrollToIndex]);

  return {
    viewportRef,
    activeIndex,
    setActiveIndex,
    scrollToIndex,
  };
}
