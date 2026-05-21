"use client";

import { useEffect, useRef } from "react";
import { gsap } from "@/lib/gsap";
import type { AtmosphereTone } from "@/hooks/useAtmosphere";
import { cn } from "@/lib/cn";
import { useReducedMotion } from "@/hooks/useReducedMotion";

type NarrativeSectionProps = {
  children: React.ReactNode;
  atmosphere?: AtmosphereTone;
  className?: string;
  dissolve?: boolean;
};

export function NarrativeSection({
  children,
  atmosphere = "neutral",
  className,
  dissolve = true,
}: NarrativeSectionProps) {
  const ref = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced || !dissolve || !ref.current) return;
    const veil = ref.current.querySelector(".narrative-section__dissolve-top");
    if (!veil) return;

    const tween = gsap.fromTo(
      veil,
      { opacity: 0 },
      {
        opacity: 1,
        ease: "none",
        scrollTrigger: {
          trigger: ref.current,
          start: "top 90%",
          end: "top 60%",
          scrub: 0.6,
        },
      }
    );

    return () => {
      tween.kill();
    };
  }, [reduced, dissolve]);

  return (
    <section
      ref={ref}
      data-atmosphere={atmosphere}
      className={cn("narrative-section", className)}
    >
      {dissolve ? <div className="narrative-section__dissolve-top" aria-hidden /> : null}
      {children}
    </section>
  );
}
