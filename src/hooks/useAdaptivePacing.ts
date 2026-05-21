"use client";

import { useEffect, useRef, useState } from "react";
import { useLenis } from "@/providers/SmoothScrollProvider";
import { useReducedMotion } from "./useReducedMotion";

export type PacingProfile = {
  /** 0 = minimal motion, 1 = default, >1 = denser pauses */
  motionDensity: number;
  /** Scales typography rhythm & reveal delays */
  typographyTempo: number;
  /** Longer pauses between narrative beats */
  pauseMultiplier: number;
  /** Reader is dwelling (slow, attentive) */
  isDwelling: boolean;
  /** Fast scroll detected */
  isRushing: boolean;
};

const DEFAULT_PACING: PacingProfile = {
  motionDensity: 1,
  typographyTempo: 1,
  pauseMultiplier: 1,
  isDwelling: false,
  isRushing: false,
};

function applyPacingToDOM(p: PacingProfile) {
  const root = document.documentElement;
  root.style.setProperty("--motion-density", String(p.motionDensity));
  root.style.setProperty("--typography-tempo", String(p.typographyTempo));
  root.style.setProperty("--pause-multiplier", String(p.pauseMultiplier));
  root.dataset.readerDwelling = p.isDwelling ? "true" : "false";
  root.dataset.readerRushing = p.isRushing ? "true" : "false";
}

export function useAdaptivePacing() {
  const lenis = useLenis();
  const reduced = useReducedMotion();
  const [pacing, setPacing] = useState<PacingProfile>(DEFAULT_PACING);
  const velocityEma = useRef(0);
  const dwellStart = useRef<number | null>(null);
  const lastScroll = useRef(0);
  const lastTime = useRef(0);
  const rafPending = useRef(false);

  useEffect(() => {
    if (reduced) {
      applyPacingToDOM(DEFAULT_PACING);
      return;
    }

    const update = (scroll: number, time: number) => {
      const dt = Math.max(time - lastTime.current, 16);
      const ds = Math.abs(scroll - lastScroll.current);
      const instant = ds / dt;
      velocityEma.current = velocityEma.current * 0.88 + instant * 0.12;

      const v = velocityEma.current;
      const isRushing = v > 2.2;
      const isDwelling = v < 0.15;

      if (isDwelling) {
        if (!dwellStart.current) dwellStart.current = time;
      } else {
        dwellStart.current = null;
      }

      const dwellDuration = dwellStart.current
        ? time - dwellStart.current
        : 0;
      const longRead = dwellDuration > 2200;

      let motionDensity = 1;
      let typographyTempo = 1;
      let pauseMultiplier = 1;

      if (isRushing) {
        motionDensity = 0.72;
        typographyTempo = 1.08;
        pauseMultiplier = 1.35;
      } else if (longRead) {
        motionDensity = 1.12;
        typographyTempo = 0.92;
        pauseMultiplier = 1.45;
      } else if (isDwelling) {
        motionDensity = 1.05;
        typographyTempo = 0.96;
        pauseMultiplier = 1.2;
      }

      const next: PacingProfile = {
        motionDensity,
        typographyTempo,
        pauseMultiplier,
        isDwelling: longRead,
        isRushing,
      };

      applyPacingToDOM(next);
      setPacing(next);

      lastScroll.current = scroll;
      lastTime.current = time;
    };

    const onScroll = () => {
      if (rafPending.current) return;
      rafPending.current = true;
      requestAnimationFrame((t) => {
        rafPending.current = false;
        const scroll = lenis?.scroll ?? window.scrollY;
        update(scroll, t);
      });
    };

    onScroll();
    const unsub = lenis?.on?.("scroll", onScroll);
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      unsub?.();
      window.removeEventListener("scroll", onScroll);
      applyPacingToDOM(DEFAULT_PACING);
    };
  }, [lenis, reduced]);

  return pacing;
}
