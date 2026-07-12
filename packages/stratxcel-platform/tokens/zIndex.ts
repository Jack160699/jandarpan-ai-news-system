/**
 * Jan Darpan Design System — Z-Index Scale
 *
 * Layered stacking context for overlays, navigation, and chrome.
 *
 * @module design-system/tokens/zIndex
 */

export const zIndex = {
  base: 0,
  raised: 10,
  dropdown: 50,
  sticky: 80,
  header: 100,
  overlay: 200,
  modal: 300,
  toast: 400,
  skipLink: 500,
} as const;

/** CSS custom property references (bridges to platform chrome) */
export const zIndexVars = {
  header: "var(--z-header)",
  nav: "var(--z-nav)",
  bottomNav: "var(--z-bottom-nav)",
  overlay: "var(--z-overlay)",
  skip: "var(--z-skip)",
} as const;

export type ZIndexToken = keyof typeof zIndex;
