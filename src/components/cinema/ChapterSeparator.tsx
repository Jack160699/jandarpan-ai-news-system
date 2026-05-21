"use client";

import { useEffect, useRef } from "react";
import { gsap } from "@/lib/gsap";
import { useReducedMotion } from "@/hooks/useReducedMotion";

type ChapterSeparatorProps = {
  label: string;
  chapter?: string;
};

export function ChapterSeparator({ label, chapter }: ChapterSeparatorProps) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced || !ref.current) return;
    const tween = gsap.from(ref.current, {
      opacity: 0,
      y: 12,
      duration: 1.2,
      ease: "power2.out",
      scrollTrigger: {
        trigger: ref.current,
        start: "top 88%",
        toggleActions: "play none none reverse",
      },
    });
    return () => {
      tween.kill();
    };
  }, [reduced]);

  return (
    <div ref={ref} className="chapter-separator editorial-container">
      <div className="chapter-separator__mark">
        <span className="chapter-separator__line" aria-hidden />
        <div className="text-center">
          {chapter ? (
            <span className="meta-label block text-[var(--ink-faint)]">
              {chapter}
            </span>
          ) : null}
          <span className="meta-label mt-2 block text-[var(--ink-muted)]">
            {label}
          </span>
        </div>
        <span className="chapter-separator__line" aria-hidden />
      </div>
    </div>
  );
}
