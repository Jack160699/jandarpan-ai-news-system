"use client";

import { useEffect, useState } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";

/**
 * Sticky reading progress bar for Article V3.
 */
export function ReadingProgress() {
  const [progress, setProgress] = useState(0);
  const reduced = useReducedMotion();

  useEffect(() => {
    const el = document.querySelector('[data-reading="article-v3"]');
    if (!el) return;

    let frame = 0;
    const update = () => {
      const rect = el.getBoundingClientRect();
      const scrollable = el.scrollHeight - window.innerHeight;
      if (scrollable <= 0) {
        setProgress(0);
        return;
      }
      const scrolled = Math.min(Math.max(-rect.top, 0), scrollable);
      setProgress(scrolled / scrollable);
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
  }, []);

  const pct = Math.round(progress * 100);

  return (
    <div
      className="article-v3-progress"
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="Reading progress"
    >
      <div
        className="article-v3-progress__bar"
        style={{
          transform: `scaleX(${progress})`,
          transition: reduced ? "none" : undefined,
        }}
      />
    </div>
  );
}
