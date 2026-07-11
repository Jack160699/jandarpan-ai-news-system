/**
 * Design system theme barrel export.
 * @module design-system/theme
 */

export type {
  ThemeMode,
  ResolvedTheme,
  JdsTheme,
  DesignSystemTheme,
  ThemeContextValue,
} from "./types";
export { lightTheme } from "./light";
export { darkTheme } from "./dark";
export { ThemeContext } from "./context";
export { ThemeProvider } from "./provider";
export type { ThemeProviderProps } from "./provider";
export { cssVars, cssVarStyle } from "./css-vars";

/** @deprecated Use ThemeProvider */
export { ThemeProvider as JdsThemeProvider } from "./provider";
