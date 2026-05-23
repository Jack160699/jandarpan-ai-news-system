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
  startNavigation: (href: string) => void;
  menuOpen: boolean;
  setMenuOpen: (open: boolean) => void;
  openMenu: () => void;
  closeMenu: () => void;
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
    setPendingPath(null);
    setMenuOpen(false);
  }, [pathname, hash]);

  const startNavigation = useCallback((href: string) => {
    const path = href.split("#")[0] || "/";
    setPendingPath(path);
  }, []);

  const value = useMemo(
    () => ({
      pathname,
      hash,
      isNavigating: pendingPath !== null,
      pendingPath,
      startNavigation,
      menuOpen,
      setMenuOpen,
      openMenu: () => setMenuOpen(true),
      closeMenu: () => setMenuOpen(false),
    }),
    [pathname, hash, pendingPath, startNavigation, menuOpen]
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
