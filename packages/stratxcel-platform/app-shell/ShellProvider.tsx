"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useSidebarState } from "../layouts/hooks/useSidebarState";
import type { ShellContextValue } from "../layouts/types";

const ShellContext = createContext<ShellContextValue | null>(null);

export function ShellProvider({ children }: { children: ReactNode }) {
  const [commandOpen, setCommandOpen] = useState(false);
  const { sidebar, setSidebarCollapsed, setSidebarWidth, toggleSidebar } =
    useSidebarState();

  const openCommandPalette = useCallback(() => setCommandOpen(true), []);
  const closeCommandPalette = useCallback(() => setCommandOpen(false), []);
  const toggleCommandPalette = useCallback(
    () => setCommandOpen((v) => !v),
    []
  );

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        toggleCommandPalette();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [toggleCommandPalette]);

  const value = useMemo<ShellContextValue>(
    () => ({
      commandOpen,
      openCommandPalette,
      closeCommandPalette,
      toggleCommandPalette,
      sidebar,
      setSidebarCollapsed,
      setSidebarWidth,
      toggleSidebar,
    }),
    [
      commandOpen,
      openCommandPalette,
      closeCommandPalette,
      toggleCommandPalette,
      sidebar,
      setSidebarCollapsed,
      setSidebarWidth,
      toggleSidebar,
    ]
  );

  return (
    <ShellContext.Provider value={value}>{children}</ShellContext.Provider>
  );
}

export function useShell(): ShellContextValue {
  const ctx = useContext(ShellContext);
  if (!ctx) {
    throw new Error("useShell must be used within ShellProvider");
  }
  return ctx;
}
