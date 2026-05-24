"use client";

import { useLayoutEffect, useState, type RefObject } from "react";
import { marqueeLoopDurationSeconds } from "@/lib/ticker/marquee-duration";

type UseTickerMarqueeDurationOptions = {
  itemCount: number;
  itemsKey: string;
};

export function useTickerMarqueeDuration(
  trackRef: RefObject<HTMLDivElement | null>,
  viewportRef: RefObject<HTMLDivElement | null>,
  { itemCount, itemsKey }: UseTickerMarqueeDurationOptions
): number {
  const [duration, setDuration] = useState(120);

  useLayoutEffect(() => {
    const track = trackRef.current;
    const viewport = viewportRef.current;
    if (!track || !viewport || itemCount === 0) {
      setDuration(120);
      return;
    }

    const measure = () => {
      const loopWidth = track.scrollWidth / 2;
      const viewportWidth = viewport.clientWidth;
      if (loopWidth <= 0 || viewportWidth <= 0) return;

      const segments = track.querySelectorAll<HTMLElement>(
        ".breaking-ticker__segment"
      );
      let maxHeadlineWidth = 0;
      segments.forEach((seg, index) => {
        if (index < itemCount) {
          maxHeadlineWidth = Math.max(maxHeadlineWidth, seg.offsetWidth);
        }
      });

      const isMobile =
        typeof window !== "undefined" &&
        window.matchMedia("(max-width: 767px)").matches;

      setDuration(
        marqueeLoopDurationSeconds(
          loopWidth,
          viewportWidth,
          maxHeadlineWidth || loopWidth / itemCount,
          isMobile
        )
      );
    };

    measure();

    const ro = new ResizeObserver(() => {
      requestAnimationFrame(measure);
    });
    ro.observe(track);
    ro.observe(viewport);

    const mq = window.matchMedia("(max-width: 767px)");
    const onMq = () => requestAnimationFrame(measure);
    mq.addEventListener("change", onMq);

    return () => {
      ro.disconnect();
      mq.removeEventListener("change", onMq);
    };
  }, [trackRef, viewportRef, itemCount, itemsKey]);

  return duration;
}
