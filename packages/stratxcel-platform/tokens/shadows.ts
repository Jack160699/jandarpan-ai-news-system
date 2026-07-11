/**
 * JDP-001 — Shadow primitives (raw values)
 * Use elevation tokens in components — not these directly.
 */
export const shadows = {
  none: "none",
  sm: "0 1px 2px rgb(42 32 18 / 0.06), 0 1px 3px rgb(42 32 18 / 0.04)",
  md: "0 4px 12px rgb(42 32 18 / 0.08), 0 2px 4px rgb(42 32 18 / 0.04)",
  lg: "0 8px 24px rgb(42 32 18 / 0.1), 0 4px 8px rgb(42 32 18 / 0.05)",
  xl: "0 16px 48px rgb(42 32 18 / 0.12), 0 8px 16px rgb(42 32 18 / 0.06)",
} as const;

export const shadowsDark = {
  none: "none",
  sm: "0 2px 8px rgb(0 0 0 / 0.4)",
  md: "0 4px 16px rgb(0 0 0 / 0.5)",
  lg: "0 8px 28px rgb(0 0 0 / 0.55)",
  xl: "0 16px 48px rgb(0 0 0 / 0.65)",
} as const;

export type ShadowToken = keyof typeof shadows;

export const shadowCssVars = {
  "--jds-shadow-sm": shadows.sm,
  "--jds-shadow-md": shadows.md,
  "--jds-shadow-lg": shadows.lg,
  "--jds-shadow-xl": shadows.xl,
} as const;
