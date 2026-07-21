"use client";

import { useEffect, useState } from "react";
import {
  DESK_CHROME_CONDENSED_MQ,
  resolveDeskChromeCondensed,
} from "./deskChromeCondensed";

/**
 * Sticky condensed chrome state — rAF-coalesced, hysteresis, MQ-gated.
 * Does not write React state on every raw scroll event.
 */
export function useDeskChromeCondensed(): boolean {
  const [condensed, setCondensed] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mq = window.matchMedia(DESK_CHROME_CONDENSED_MQ);
    let raf = 0;
    let current = false;

    const apply = (next: boolean) => {
      if (next === current) return;
      current = next;
      setCondensed(next);
    };

    const read = () => {
      raf = 0;
      if (!mq.matches) {
        apply(false);
        return;
      }
      apply(resolveDeskChromeCondensed(window.scrollY, current));
    };

    const onScroll = () => {
      if (raf) return;
      raf = window.requestAnimationFrame(read);
    };

    const onMq = () => {
      if (raf) {
        window.cancelAnimationFrame(raf);
        raf = 0;
      }
      read();
    };

    read();
    window.addEventListener("scroll", onScroll, { passive: true });
    mq.addEventListener("change", onMq);

    return () => {
      window.removeEventListener("scroll", onScroll);
      mq.removeEventListener("change", onMq);
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, []);

  return condensed;
}
