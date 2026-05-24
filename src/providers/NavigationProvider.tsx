"use client";

import { usePathname } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type NavigationContextValue = {
  pathname: string;
  hash: string;
  isNavigating: boolean;
  pendingPath: string | null;
  menuOpen: boolean;
  openMenu: () => void;
  closeMenu: () => void;
  toggleMenu: () => void;
  startNavigation: (href: string) => void;
  completeNavigation: () => void;
};

const NavigationContext = createContext<NavigationContextValue | null>(null);

export function NavigationProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [hash, setHash] = useState("");
  const [pendingPath, setPendingPath] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const syncHash = () => setHash(window.location.hash);
    syncHash();
    window.addEventListener("hashchange", syncHash);
    return () => window.removeEventListener("hashchange", syncHash);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  useEffect(() => {
    if (!menuOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [menuOpen]);

  const openMenu = useCallback(() => setMenuOpen(true), []);
  const closeMenu = useCallback(() => setMenuOpen(false), []);
  const toggleMenu = useCallback(() => setMenuOpen((v) => !v), []);

  const startNavigation = useCallback((href: string) => {
    const path = href.split("#")[0] || "/";
    setPendingPath(path);
  }, []);

  const completeNavigation = useCallback(() => {
    setPendingPath(null);
  }, []);

  const value = useMemo(
    () => ({
      pathname,
      hash,
      isNavigating: pendingPath !== null,
      pendingPath,
      menuOpen,
      openMenu,
      closeMenu,
      toggleMenu,
      startNavigation,
      completeNavigation,
    }),
    [
      pathname,
      hash,
      pendingPath,
      menuOpen,
      openMenu,
      closeMenu,
      toggleMenu,
      startNavigation,
      completeNavigation,
    ]
  );

  return (
    <NavigationContext.Provider value={value}>
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigation() {
  const ctx = useContext(NavigationContext);
  if (!ctx) {
    throw new Error("useNavigation must be used within NavigationProvider");
  }
  return ctx;
}
