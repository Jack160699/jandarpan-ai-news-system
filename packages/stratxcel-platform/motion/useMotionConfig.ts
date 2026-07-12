"use client";

/**
 * JDP-009 — Hook that exposes reduced-motion state and token-based transitions
 */
import { useMemo } from "react";
import type { Transition } from "framer-motion";
import { useReducedMotion } from "../hooks/design-system/useReducedMotion";
import type { MotionPreset } from "../tokens";
import { buildTransition, INSTANT_TRANSITION } from "./utils";

export function useMotionConfig() {
  const reduced = useReducedMotion();

  return useMemo(
    () => ({
      reduced,
      instantTransition: INSTANT_TRANSITION,
      transition: (preset: MotionPreset = "normal", overrides?: Partial<Transition>) =>
        buildTransition(preset, reduced, overrides),
    }),
    [reduced]
  );
}
