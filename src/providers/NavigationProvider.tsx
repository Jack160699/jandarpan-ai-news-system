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
  completeNavigation: () => void;
};

const NavigationContext = createContext<NavigationContextValue | null>(null);

export function NavigationProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [hash, setHash] = useState("");
  const [pendingPath, setPendingPath] = useState<string | null>(null);

  useEffect(() => {
    const syncHash = () => setHash(window.location.hash);
    syncHash();
    window.addEventListener("hashchange", syncHash);
    return () => window.removeEventListener("hashchange", syncHash);
  }, []);

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
      startNavigation,
      completeNavigation,
    }),
    [pathname, hash, pendingPath, startNavigation, completeNavigation]
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
