"use client";

import { useEffect, useRef } from "react";
import type { MonetizationEventType } from "@/lib/monetization/types";
import { useMonetizationOptional } from "@/providers/MonetizationProvider";

export function useAdImpression(
  slotId: string,
  placementType: string,
  enabled = true
) {
  const monetization = useMonetizationOptional();
  const ref = useRef<HTMLDivElement>(null);
  const sent = useRef(false);

  useEffect(() => {
    if (!enabled || !monetization || sent.current) return;

    const el = ref.current;
    if (!el) return;

    const lazy = monetization.settings.lazyLoad;

    const fire = () => {
      if (sent.current) return;
      sent.current = true;
      el.classList.add("mnr-unit--visible");
      monetization.track("impression", { slotId, placementType });
    };

    if (!lazy) {
      fire();
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          fire();
          observer.disconnect();
        }
      },
      { rootMargin: "120px", threshold: 0.1 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [enabled, monetization, slotId, placementType]);

  return ref;
}

export function trackMonetizationClick(
  track: (
    event: MonetizationEventType,
    meta?: Record<string, string | number | undefined>
  ) => void,
  eventType: MonetizationEventType,
  meta: Record<string, string | undefined>
) {
  track(eventType, meta);
}
