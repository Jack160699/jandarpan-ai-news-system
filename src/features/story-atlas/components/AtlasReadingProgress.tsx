"use client";

import { memo, useEffect, useState } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";

type AtlasReadingProgressProps = {
  onProgress?: (ratio: number) => void;
};

export const AtlasReadingProgress = memo(function AtlasReadingProgress({
  onProgress,
}: AtlasReadingProgressProps) {
  const [progress, setProgress] = useState(0);
  const reduced = useReducedMotion();

  useEffect(() => {
    const el = document.querySelector('[data-reading="story-atlas"]');
    if (!el) return;

    let frame = 0;
    const update = () => {
      const rect = el.getBoundingClientRect();
      const scrollable = el.scrollHeight - window.innerHeight;
      if (scrollable <= 0) {
        setProgress(0);
        onProgress?.(0);
        return;
      }
      const scrolled = Math.min(Math.max(-rect.top, 0), scrollable);
      const ratio = scrolled / scrollable;
      setProgress(ratio);
      onProgress?.(ratio);
    };

    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        update();
        frame = 0;
      });
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", update);

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", update);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [onProgress]);

  const pct = Math.round(progress * 100);

  return (
    <div
      className="atlas-story-progress"
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="Reading progress"
    >
      <div
        className="atlas-story-progress__bar"
        style={{
          transform: `scaleX(${progress})`,
          transition: reduced ? "none" : "transform 120ms ease",
        }}
      />
    </div>
  );
});
