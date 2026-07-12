"use client";

import { usePathname } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  isStoryPath,
  saveStoryReferrer,
} from "@/lib/mobile/navigation-state";
import {
  getRecordedScrollPosition,
  saveScrollPosition,
} from "@/lib/mobile/scroll-retention";

type NavigationContextValue = {
  pathname: string;
  hash: string;
  isNavigating: boolean;
  pendingPath: string | null;
  navigationEpoch: number;
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
  const [navigationEpoch, setNavigationEpoch] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const prevPathnameRef = useRef(pathname);

  useEffect(() => {
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
  }, []);

  useEffect(() => {
    const onClickCapture = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest("a[href]");
      if (!anchor) return;
      const href = anchor.getAttribute("href") ?? "";
      if (!href.startsWith("/story/")) return;
      const scrollY =
        getRecordedScrollPosition(pathname) ?? Math.max(0, window.scrollY);
      saveScrollPosition(pathname, scrollY);
      saveStoryReferrer(
        pathname,
        scrollY,
        window.location.search,
        window.location.hash
      );
    };
    document.addEventListener("click", onClickCapture, true);
    return () => document.removeEventListener("click", onClickCapture, true);
  }, [pathname]);

  useEffect(() => {
    const prev = prevPathnameRef.current;
    if (prev && prev !== pathname) {
      saveScrollPosition(prev);
    }
    prevPathnameRef.current = pathname;
  }, [pathname]);

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

  const startNavigation = useCallback(
    (href: string) => {
      const path = href.split("#")[0] || "/";
      if (typeof window !== "undefined") {
        const scrollY =
          getRecordedScrollPosition(pathname) ?? Math.max(0, window.scrollY);
        saveScrollPosition(pathname, scrollY);
        if (isStoryPath(path) && !isStoryPath(pathname)) {
          saveStoryReferrer(
            pathname,
            scrollY,
            window.location.search,
            window.location.hash
          );
        }
      }
      setPendingPath(path);
    },
    [pathname]
  );

  const completeNavigation = useCallback(() => {
    setPendingPath(null);
    setNavigationEpoch((n) => n + 1);
  }, []);

  const value = useMemo(
    () => ({
      pathname,
      hash,
      isNavigating: pendingPath !== null,
      pendingPath,
      navigationEpoch,
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
      navigationEpoch,
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
