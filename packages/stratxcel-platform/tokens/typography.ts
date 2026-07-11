/**
 * JDP-001 — Typography hierarchy
 *
 * Roles: Display, Hero, H1–H3, Title, Body, Caption, Meta, Label, Button
 * Font families reference existing reader font CSS variables.
 */
export const fontFamily = {
  display: 'var(--font-display), Georgia, "Times New Roman", serif',
  body: 'var(--font-body), Georgia, serif',
  ui: 'var(--font-ui), system-ui, sans-serif',
  meta: 'var(--font-meta), ui-monospace, monospace',
} as const;

export const fontWeight = {
  regular: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
  extrabold: 800,
} as const;

export const lineHeight = {
  tight: 1.32,
  snug: 1.45,
  normal: 1.58,
  relaxed: 1.62,
} as const;

export const letterSpacing = {
  tight: "-0.025em",
  normal: "0",
  wide: "0.04em",
  wider: "0.08em",
} as const;

/** Typography role definitions */
export const typography = {
  display: {
    fontFamily: fontFamily.display,
    fontSize: "clamp(2.5rem, 6vw, 4rem)",
    fontWeight: fontWeight.extrabold,
    lineHeight: lineHeight.tight,
    letterSpacing: letterSpacing.tight,
  },
  hero: {
    fontFamily: fontFamily.display,
    fontSize: "clamp(2.125rem, 7vw, 3rem)",
    fontWeight: fontWeight.bold,
    lineHeight: lineHeight.tight,
    letterSpacing: letterSpacing.tight,
  },
  h1: {
    fontFamily: fontFamily.display,
    fontSize: "clamp(1.75rem, 4vw, 2.25rem)",
    fontWeight: fontWeight.bold,
    lineHeight: lineHeight.tight,
    letterSpacing: letterSpacing.tight,
  },
  h2: {
    fontFamily: fontFamily.display,
    fontSize: "clamp(1.5rem, 3vw, 1.875rem)",
    fontWeight: fontWeight.bold,
    lineHeight: lineHeight.snug,
    letterSpacing: letterSpacing.normal,
  },
  h3: {
    fontFamily: fontFamily.display,
    fontSize: "clamp(1.25rem, 2.5vw, 1.5rem)",
    fontWeight: fontWeight.semibold,
    lineHeight: lineHeight.snug,
    letterSpacing: letterSpacing.normal,
  },
  title: {
    fontFamily: fontFamily.body,
    fontSize: "1.3125rem",
    fontWeight: fontWeight.semibold,
    lineHeight: lineHeight.snug,
    letterSpacing: letterSpacing.normal,
  },
  body: {
    fontFamily: fontFamily.body,
    fontSize: "1.1875rem",
    fontWeight: fontWeight.regular,
    lineHeight: lineHeight.normal,
    letterSpacing: letterSpacing.normal,
  },
  caption: {
    fontFamily: fontFamily.ui,
    fontSize: "0.875rem",
    fontWeight: fontWeight.regular,
    lineHeight: lineHeight.relaxed,
    letterSpacing: letterSpacing.normal,
  },
  meta: {
    fontFamily: fontFamily.meta,
    fontSize: "0.8125rem",
    fontWeight: fontWeight.medium,
    lineHeight: lineHeight.snug,
    letterSpacing: letterSpacing.wide,
    textTransform: "uppercase" as const,
  },
  label: {
    fontFamily: fontFamily.ui,
    fontSize: "0.8125rem",
    fontWeight: fontWeight.semibold,
    lineHeight: lineHeight.snug,
    letterSpacing: letterSpacing.wide,
  },
  button: {
    fontFamily: fontFamily.ui,
    fontSize: "1rem",
    fontWeight: fontWeight.medium,
    lineHeight: 1.2,
    letterSpacing: letterSpacing.normal,
  },
} as const;

export type TypographyRole = keyof typeof typography;

export const typographyCssVars = {
  "--jds-font-display": fontFamily.display,
  "--jds-font-body": fontFamily.body,
  "--jds-font-ui": fontFamily.ui,
  "--jds-font-meta": fontFamily.meta,
  "--jds-text-display": typography.display.fontSize,
  "--jds-text-hero": typography.hero.fontSize,
  "--jds-text-h1": typography.h1.fontSize,
  "--jds-text-h2": typography.h2.fontSize,
  "--jds-text-h3": typography.h3.fontSize,
  "--jds-text-title": typography.title.fontSize,
  "--jds-text-body": typography.body.fontSize,
  "--jds-text-caption": typography.caption.fontSize,
  "--jds-text-meta": typography.meta.fontSize,
  "--jds-text-label": typography.label.fontSize,
  "--jds-text-button": typography.button.fontSize,
} as const;
