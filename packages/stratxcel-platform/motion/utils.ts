/**
 * JDP-009 — Motion utilities (token bridge + reduced-motion helpers)
 */
import type { Transition, Variants } from "framer-motion";
import { durations, motion, type DurationToken, type MotionPreset } from "../tokens";

export const INSTANT_TRANSITION: Transition = { duration: 0, delay: 0 };

/** Convert design-system duration tokens (ms) to Framer Motion seconds */
export function msToSeconds(ms: number): number {
  return ms / 1000;
}

/** Parse `cubic-bezier(a, b, c, d)` into a Framer Motion ease tuple */
export function parseCubicBezier(value: string): [number, number, number, number] {
  const match = value.match(/cubic-bezier\(\s*([\d.+-]+)\s*,\s*([\d.+-]+)\s*,\s*([\d.+-]+)\s*,\s*([\d.+-]+)\s*\)/);
  if (!match) return [0.22, 1, 0.36, 1];
  return [
    Number(match[1]),
    Number(match[2]),
    Number(match[3]),
    Number(match[4]),
  ];
}

export function durationToken(token: DurationToken = "normal"): number {
  return msToSeconds(durations[token]);
}

export function buildTransition(
  preset: MotionPreset = "normal",
  reduced = false,
  overrides?: Partial<Transition>
): Transition {
  if (reduced) return { ...INSTANT_TRANSITION, ...overrides };

  const { duration, easing: easeStr } = motion[preset];
  return {
    duration: msToSeconds(duration),
    ease: parseCubicBezier(easeStr),
    ...overrides,
  };
}

/** Strip motion transforms for reduced-motion users while preserving layout */
export function reduceVariants<T extends Variants>(variants: T, reduced: boolean): T {
  if (!reduced) return variants;

  const stripMotion = (state: Record<string, unknown>) => {
    const { x, y, scale, rotate, rotateX, rotateY, rotateZ, ...rest } = state;
    void x;
    void y;
    void scale;
    void rotate;
    void rotateX;
    void rotateY;
    void rotateZ;
    return { ...rest, transition: INSTANT_TRANSITION };
  };

  const reducedEntries = Object.entries(variants).map(([key, value]) => {
    if (typeof value === "function") return [key, value];
    if (!value || typeof value !== "object") return [key, value];
    return [key, stripMotion(value as Record<string, unknown>)];
  });

  return Object.fromEntries(reducedEntries) as T;
}

export function slideOffset(direction: "up" | "down" | "left" | "right", distance: number) {
  switch (direction) {
    case "up":
      return { x: 0, y: distance };
    case "down":
      return { x: 0, y: -distance };
    case "left":
      return { x: distance, y: 0 };
    case "right":
      return { x: -distance, y: 0 };
  }
}
