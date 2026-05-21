"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { gsap } from "@/lib/gsap";
import { useReducedMotion } from "@/hooks/useReducedMotion";

type ArticleUnfoldProps = {
  children: ReactNode;
};

export function ArticleUnfold({ children }: ArticleUnfoldProps) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced || !ref.current) return;

    const el = ref.current;
    const tween = gsap.fromTo(
      el,
      {
        opacity: 0,
        rotateX: -6,
        y: 40,
        transformOrigin: "top center",
        clipPath: "inset(0 0 12% 0)",
      },
      {
        opacity: 1,
        rotateX: 0,
        y: 0,
        clipPath: "inset(0 0 0% 0)",
        duration: 1.65,
        ease: "power2.inOut",
        delay: 0.12,
      }
    );

    return () => {
      tween.kill();
    };
  }, [reduced]);

  return (
    <div ref={ref} className="article-unfold perspective-[1400px]">
      {children}
    </div>
  );
}
