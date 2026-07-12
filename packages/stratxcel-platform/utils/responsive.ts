import { breakpoints } from "../tokens/breakpoints";

type ResponsiveValue<T> = T | { base: T; sm?: T; md?: T; lg?: T; xl?: T };

/**
 * Resolve a responsive value to a CSS-friendly string for inline styles.
 * For class-based responsive design, prefer CSS media queries in components.css.
 */
export function resolveResponsive<T extends string | number>(
  value: ResponsiveValue<T>
): T {
  if (typeof value === "object" && value !== null && "base" in value) {
    return value.base;
  }
  return value as T;
}

export { breakpoints };
