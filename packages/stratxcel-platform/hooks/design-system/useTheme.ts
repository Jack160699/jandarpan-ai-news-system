"use client";

import { useContext } from "react";
import { ThemeContext } from "../../theme/context";
import type { ThemeContextValue } from "../../theme/types";

/**
 * Access the current design system theme (mode, resolved, colors).
 * Must be used within ThemeProvider, or returns default light theme.
 */
export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
