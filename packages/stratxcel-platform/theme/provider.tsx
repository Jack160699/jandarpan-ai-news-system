"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { darkColors, lightColors } from "../tokens/colors";
import { ThemeContext } from "./context";
import type { ResolvedTheme, ThemeMode } from "./types";

export type ThemeProviderProps = {
  children: ReactNode;
  /** Initial theme mode. Defaults to "system". */
  defaultMode?: ThemeMode;
  /** Storage key for persisting theme preference */
  storageKey?: string;
  /** Apply data-jds-theme attribute to documentElement */
  applyToDocument?: boolean;
  /** Sync with existing html[data-theme] attribute (reader prefs) */
  syncWithReaderTheme?: boolean;
};

function getSystemTheme(): ResolvedTheme {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function readStoredMode(storageKey: string): ThemeMode | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(storageKey);
    if (raw === "light" || raw === "dark" || raw === "system") return raw;
  } catch {
    /* ignore */
  }
  return null;
}

function readReaderTheme(): ResolvedTheme | null {
  if (typeof document === "undefined") return null;
  const theme = document.documentElement.dataset.theme;
  if (theme === "dark" || theme === "light") return theme;
  return null;
}

/**
 * ThemeProvider — manages light/dark/system modes for the design system.
 *
 * Does not replace ReaderPreferencesProvider. When `syncWithReaderTheme` is true
 * (default), it reads the existing `data-theme` attribute set by ThemeScript.
 */
export function ThemeProvider({
  children,
  defaultMode = "system",
  storageKey = "jds-theme",
  applyToDocument = true,
  syncWithReaderTheme = true,
}: ThemeProviderProps) {
  const [mode, setModeState] = useState<ThemeMode>(() => {
    return readStoredMode(storageKey) ?? defaultMode;
  });

  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>("light");
  const [readerTheme, setReaderTheme] = useState<ResolvedTheme | null>(null);

  useEffect(() => {
    setSystemTheme(getSystemTheme());
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => setSystemTheme(mq.matches ? "dark" : "light");
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    if (!syncWithReaderTheme) return;
    setReaderTheme(readReaderTheme());
    const observer = new MutationObserver(() => {
      setReaderTheme(readReaderTheme());
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    return () => observer.disconnect();
  }, [syncWithReaderTheme]);

  const resolved: ResolvedTheme = useMemo(() => {
    if (syncWithReaderTheme && readerTheme) return readerTheme;
    if (mode === "system") return systemTheme;
    return mode;
  }, [mode, systemTheme, readerTheme, syncWithReaderTheme]);

  const colors = resolved === "dark" ? darkColors : lightColors;

  useEffect(() => {
    if (!applyToDocument) return;
    document.documentElement.dataset.jdsTheme = resolved;
  }, [resolved, applyToDocument]);

  const setMode = useCallback(
    (next: ThemeMode) => {
      setModeState(next);
      try {
        localStorage.setItem(storageKey, next);
      } catch {
        /* ignore */
      }
    },
    [storageKey]
  );

  const toggle = useCallback(() => {
    setMode(resolved === "light" ? "dark" : "light");
  }, [resolved, setMode]);

  const value = useMemo(
    () => ({
      mode,
      resolved,
      colors,
      setMode,
      toggle,
    }),
    [mode, resolved, colors, setMode, toggle]
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}
