"use client";

import { useEffect, useState } from "react";

type ReadingProgressProps = {
  target?: string;
};

export function ReadingProgress({ target = "article" }: ReadingProgressProps) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const el = document.querySelector(`[data-reading="${target}"]`);
    if (!el) return;

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

    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);

    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [target]);

  return (
    <div
      className="reading-progress fixed left-0 right-0 top-0 z-[60] h-[2px] bg-[var(--rule)]"
      role="progressbar"
      aria-valuenow={Math.round(progress * 100)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="Reading progress"
    >
      <div
        className="reading-progress__bar h-full origin-left bg-[var(--ink-primary)]"
        style={{ transform: `scaleX(${progress})` }}
      />
    </div>
  );
}
