"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { gsap } from "@/lib/gsap";
import { cn } from "@/lib/cn";
import { useReducedMotion } from "@/hooks/useReducedMotion";

type TypographyCinemaProps = {
  children: ReactNode;
  className?: string;
  drift?: boolean;
  scaleOnScroll?: boolean;
};

export function TypographyCinema({
  children,
  className,
  drift = true,
  scaleOnScroll = false,
}: TypographyCinemaProps) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced || !ref.current) return;

    const el = ref.current;
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: el,
        start: "top 85%",
        end: "bottom 15%",
        scrub: 1.6,
      },
    });

    if (drift) {
      tl.to(el, { y: -12, x: 4, ease: "none" }, 0);
    }
    if (scaleOnScroll) {
      tl.fromTo(el, { scale: 1.02 }, { scale: 0.98, ease: "none" }, 0);
    }

    return () => {
      tl.kill();
    };
  }, [reduced, drift, scaleOnScroll]);

  return (
    <div ref={ref} className={cn("type-cinema", className)}>
      {children}
    </div>
  );
}
