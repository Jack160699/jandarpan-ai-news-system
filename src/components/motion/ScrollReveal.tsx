"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { DURATION, STAGGER } from "@/animations/easing";
import { cinematicEase, gsap } from "@/lib/gsap";
import { cn } from "@/lib/cn";
import { useReducedMotion } from "@/hooks/useReducedMotion";

type ScrollRevealProps = {
  children: ReactNode;
  className?: string;
  stagger?: number;
};

export function ScrollReveal({
  children,
  className,
  stagger = STAGGER.editorial,
}: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced || !ref.current) return;
    const container = ref.current;
    const targets = container.querySelectorAll("[data-reveal]");
    if (!targets.length) return;

    const tween = gsap.from(targets, {
      opacity: 0,
      y: 24,
      duration: DURATION.slow,
      ease: cinematicEase,
      stagger,
      scrollTrigger: {
        trigger: container,
        start: "top 82%",
        toggleActions: "play none none reverse",
      },
    });

    return () => {
      tween.kill();
    };
  }, [reduced, stagger]);

  return (
    <div ref={ref} className={cn(className)}>
      {children}
    </div>
  );
}
