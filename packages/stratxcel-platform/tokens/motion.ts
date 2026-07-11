/**
 * JDP-001 — Motion system
 * Standard easing curves and motion presets.
 */
import { durations } from "./durations";

export const easing = {
  /** Standard ease-out — most UI transitions */
  standard: "cubic-bezier(0.22, 1, 0.36, 1)",
  /** Snappy ease — buttons, chips */
  snappy: "cubic-bezier(0.33, 1, 0.68, 1)",
  /** Spring-like — cards, modals */
  spring: "cubic-bezier(0.34, 1.2, 0.64, 1)",
  /** Linear — marquees, progress */
  linear: "linear",
} as const;

export type EasingToken = keyof typeof easing;

/** Named motion presets combining duration + easing */
export const motion = {
  fast: {
    duration: durations.fast,
    easing: easing.snappy,
  },
  normal: {
    duration: durations.normal,
    easing: easing.standard,
  },
  slow: {
    duration: durations.slow,
    easing: easing.standard,
  },
} as const;

export type MotionPreset = keyof typeof motion;

/** Micro-interaction scale values */
export const motionScale = {
  tap: 0.97,
  hoverLift: -1,
} as const;

export const motionCssVars = {
  "--jds-ease-standard": easing.standard,
  "--jds-ease-snappy": easing.snappy,
  "--jds-ease-spring": easing.spring,
  "--jds-ease-linear": easing.linear,
  "--jds-motion-tap-scale": String(motionScale.tap),
  "--jds-motion-hover-lift": `${motionScale.hoverLift}px`,
  "--jds-transition-fast": `all ${durations.fast}ms ${easing.snappy}`,
  "--jds-transition-normal": `all ${durations.normal}ms ${easing.standard}`,
  "--jds-transition-slow": `all ${durations.slow}ms ${easing.standard}`,
} as const;
