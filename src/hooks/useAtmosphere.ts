"use client";

import { useEffect } from "react";
import { ScrollTrigger } from "@/lib/gsap";
import { useReducedMotion } from "./useReducedMotion";

export type AtmosphereTone =
  | "neutral"
  | "warm"
  | "editorial"
  | "cool"
  | "deep";

export function useAtmosphere(rootSelector = "[data-narrative-root]") {
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced) return;

    const root = document.querySelector(rootSelector);
    if (!root) return;

    const sections = root.querySelectorAll<HTMLElement>("[data-atmosphere]");
    if (!sections.length) return;

    const triggers: ScrollTrigger[] = [];

    sections.forEach((section) => {
      const tone = section.dataset.atmosphere as AtmosphereTone;
      if (!tone) return;

      const st = ScrollTrigger.create({
        trigger: section,
        start: "top 55%",
        end: "bottom 45%",
        onEnter: () => {
          document.documentElement.setAttribute("data-atmosphere", tone);
        },
        onEnterBack: () => {
          document.documentElement.setAttribute("data-atmosphere", tone);
        },
      });
      triggers.push(st);
    });

    const first = sections[0]?.dataset.atmosphere;
    if (first) document.documentElement.setAttribute("data-atmosphere", first);

    return () => {
      triggers.forEach((t) => t.kill());
      document.documentElement.removeAttribute("data-atmosphere");
    };
  }, [reduced, rootSelector]);
}
