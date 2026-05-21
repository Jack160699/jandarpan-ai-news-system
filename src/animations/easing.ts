/** Cinematic easing curves — restrained, editorial, expensive */

export const EASE = {
  cinematic: [0.22, 1, 0.36, 1] as const,
  editorial: [0.45, 0, 0.15, 1] as const,
  paper: [0.16, 1, 0.3, 1] as const,
  reveal: [0.33, 1, 0.68, 1] as const,
  soft: [0.25, 0.46, 0.45, 0.94] as const,
} as const;

export const DURATION = {
  fast: 0.55,
  base: 0.95,
  slow: 1.45,
  editorial: 1.75,
  cinematic: 2.1,
} as const;

export const STAGGER = {
  tight: 0.08,
  base: 0.12,
  editorial: 0.18,
  loose: 0.28,
  hero: 0.22,
} as const;
