"use client";

import { useEffect, useRef } from "react";
import { gsap } from "@/lib/gsap";
import { cn } from "@/lib/cn";
import { useReducedMotion } from "@/hooks/useReducedMotion";

type CinematicQuoteProps = {
  children: string;
  className?: string;
};

export function CinematicQuote({ children, className }: CinematicQuoteProps) {
  const ref = useRef<HTMLQuoteElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced || !ref.current) return;
    const tween = gsap.to(ref.current, {
      opacity: 1,
      y: 0,
      duration: 1.5,
      ease: "power2.out",
      scrollTrigger: {
        trigger: ref.current,
        start: "top 82%",
        toggleActions: "play none none reverse",
      },
    });
    return () => {
      tween.kill();
    };
  }, [reduced]);

  return (
    <blockquote
      ref={ref}
      className={cn("cinematic-quote editorial-container", className)}
    >
      <p className="cinematic-quote__text pull-quote max-w-[18ch] mx-auto text-center text-[var(--ink-primary)]">
        &ldquo;{children}&rdquo;
      </p>
    </blockquote>
  );
}
