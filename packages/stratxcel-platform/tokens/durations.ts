/**
 * JDP-001 — Duration tokens (milliseconds)
 * Micro-interaction timings for consistent motion feel.
 */
export const durations = {
  /** 100ms — instant feedback */
  instant: 100,
  /** 160ms — fast micro-interactions */
  fast: 160,
  /** 240ms — standard transitions */
  normal: 240,
  /** 420ms — slow, deliberate motion */
  slow: 420,
  /** 600ms — page-level transitions */
  slower: 600,
} as const;

export type DurationToken = keyof typeof durations;

export const durationsCssVars = {
  "--jds-duration-instant": `${durations.instant}ms`,
  "--jds-duration-fast": `${durations.fast}ms`,
  "--jds-duration-normal": `${durations.normal}ms`,
  "--jds-duration-slow": `${durations.slow}ms`,
  "--jds-duration-slower": `${durations.slower}ms`,
} as const;
