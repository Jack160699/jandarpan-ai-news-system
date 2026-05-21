"use client";

import { useEffect, useRef } from "react";
import { useEditorialIntelligenceOptional } from "@/providers/EditorialIntelligenceProvider";
import { useReducedMotion } from "@/hooks/useReducedMotion";

const SECTIONS = [
  { id: "masthead", label: "Masthead", selector: '[data-section="masthead"]' },
  { id: "hero", label: "Lead story", selector: '[data-section="hero"]' },
  { id: "folio", label: "Folio", selector: '[data-section="folio"]' },
  { id: "editorial", label: "Edition", selector: '[data-section="editorial"]' },
  { id: "opinion", label: "Opinion", selector: '[data-section="opinion"]' },
  {
    id: "investigations",
    label: "Investigations",
    selector: '[data-section="investigations"]',
  },
] as const;

export function ReadingJourneyTracker() {
  const ctx = useEditorialIntelligenceOptional();
  const reduced = useReducedMotion();
  const enteredAt = useRef<Record<string, number>>({});

  useEffect(() => {
    if (reduced || !ctx) return;

    const observers: IntersectionObserver[] = [];

    SECTIONS.forEach(({ id, label, selector }) => {
      const el = document.querySelector(selector);
      if (!el) return;

      const obs = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              enteredAt.current[id] = Date.now();
            } else if (enteredAt.current[id]) {
              const dwell = Date.now() - enteredAt.current[id];
              if (dwell > 800) {
                ctx.markSection(id, label, dwell);
              }
              delete enteredAt.current[id];
            }
          });
        },
        { threshold: 0.35, rootMargin: "-10% 0px" }
      );

      obs.observe(el);
      observers.push(obs);
    });

    return () => observers.forEach((o) => o.disconnect());
  }, [ctx, reduced]);

  return null;
}
