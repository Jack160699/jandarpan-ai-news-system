"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { gsap } from "@/lib/gsap";
import { cn } from "@/lib/cn";
import { useEditorialIntelligenceOptional } from "@/providers/EditorialIntelligenceProvider";
import { useReducedMotion } from "@/hooks/useReducedMotion";

type ArcPhase = "opening" | "rising" | "peak" | "release";

type NarrativeArcProps = {
  phase: ArcPhase;
  children: ReactNode;
  className?: string;
};

const ARC_CLASS: Record<ArcPhase, string> = {
  opening: "",
  rising: "narrative-arc--rising",
  peak: "narrative-arc--peak",
  release: "narrative-arc--release",
};

export function NarrativeArc({ phase, children, className }: NarrativeArcProps) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const ctx = useEditorialIntelligenceOptional();

  useEffect(() => {
    if (reduced || !ref.current) return;

    const pauseMult = ctx?.pacing.pauseMultiplier ?? 1;
    const duration = (phase === "peak" ? 1.6 : 1.2) * pauseMult;

    const tween = gsap.from(ref.current, {
      opacity: phase === "opening" ? 0.92 : 0.78,
      y: phase === "release" ? 8 : 14,
      duration,
      ease: "power2.out",
      scrollTrigger: {
        trigger: ref.current,
        start: phase === "peak" ? "top 75%" : "top 88%",
        toggleActions: "play none none reverse",
      },
    });

    return () => {
      tween.kill();
    };
  }, [reduced, phase, ctx?.pacing.pauseMultiplier]);

  return (
    <div
      ref={ref}
      className={cn("narrative-arc", ARC_CLASS[phase], className)}
      data-narrative-phase={phase}
    >
      {children}
    </div>
  );
}
