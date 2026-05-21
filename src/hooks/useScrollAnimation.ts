"use client";

import { useEffect, useRef } from "react";
import { gsap, registerGsap, ScrollTrigger } from "@/lib/gsap";
import { useReducedMotion } from "./useReducedMotion";

type ScrollAnimationFn = (
  target: HTMLElement,
  ctx: { gsap: typeof gsap; ScrollTrigger: typeof ScrollTrigger }
) => gsap.core.Tween | gsap.core.Timeline | void;

export function useScrollAnimation(
  animation: ScrollAnimationFn,
  deps: unknown[] = []
) {
  const ref = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced || !ref.current) return;

    registerGsap();
    const el = ref.current;
    const tween = animation(el, { gsap, ScrollTrigger });

    return () => {
      tween?.kill();
      ScrollTrigger.getAll().forEach((st) => {
        if (st.trigger === el) st.kill();
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduced, ...deps]);

  return ref;
}
