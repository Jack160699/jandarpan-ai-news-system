/**
 * Design system theme types.
 * @module design-system/theme/types
 */

import type { SemanticColors } from "../tokens/colors";

export type ThemeMode = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

/** Alias for backward compatibility */
export type JdsTheme = ThemeMode;

export interface DesignSystemTheme {
  mode: ResolvedTheme;
  resolved: ResolvedTheme;
  colors: SemanticColors;
}

export interface ThemeContextValue {
  /** User-selected theme preference */
  mode: ThemeMode;
  /** Resolved theme after system preference */
  resolved: ResolvedTheme;
  colors: SemanticColors;
  setMode: (mode: ThemeMode) => void;
  toggle: () => void;
}

/** @deprecated Use ThemeContextValue.setMode */
export type LegacyThemeContext = {
  theme: ThemeMode;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
};
