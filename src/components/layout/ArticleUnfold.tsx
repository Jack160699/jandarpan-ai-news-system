"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";

type ArticleUnfoldProps = {
  children: ReactNode;
};

/** Subtle entry only — no fold / 3D cinema */
export function ArticleUnfold({ children }: ArticleUnfoldProps) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced || !ref.current) return;
    ref.current.style.opacity = "0";
    const id = requestAnimationFrame(() => {
      if (ref.current) {
        ref.current.style.transition = "opacity 0.35s ease";
        ref.current.style.opacity = "1";
      }
    });
    return () => cancelAnimationFrame(id);
  }, [reduced]);

  return (
    <div ref={ref} className="article-unfold">
      {children}
    </div>
  );
}
