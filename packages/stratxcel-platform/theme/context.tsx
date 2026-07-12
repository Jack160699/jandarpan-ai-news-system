"use client";

import { createContext } from "react";
import type { ThemeContextValue } from "./types";
import { lightTheme } from "./light";

/**
 * Design system theme context.
 * Defaults to light — wrap with ThemeProvider for runtime theming.
 */
export const ThemeContext = createContext<ThemeContextValue>({
  ...lightTheme,
  setMode: () => {},
  toggle: () => {},
});

ThemeContext.displayName = "JdsThemeContext";
