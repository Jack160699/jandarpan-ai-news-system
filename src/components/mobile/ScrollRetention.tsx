"use client";

import { usePathname } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, type ReactNode } from "react";
import { isListRestorePath } from "@/lib/mobile/navigation-state";
import {
  recordScrollPosition,
  restoreScrollPosition,
  restoreScrollPositionSync,
  saveScrollPosition,
} from "@/lib/mobile/scroll-retention";
import { prefersReducedMotion } from "@/lib/navigation/transition-config";
import { useNavigation } from "@/providers/NavigationProvider";

type ScrollRetentionProps = {
  children: ReactNode;
};

/** Track scroll live and restore after route transition settles */
export function ScrollRetention({ children }: ScrollRetentionProps) {
  const pathname = usePathname();
  const { navigationEpoch } = useNavigation();
  const prevPath = useRef<string | null>(null);
  const mounted = useRef(false);

  useEffect(() => {
    const onScroll = () => recordScrollPosition(pathname, window.scrollY);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [pathname]);

  useEffect(() => {
    const prev = prevPath.current;
    if (prev && prev !== pathname) {
      saveScrollPosition(prev);
    }
    prevPath.current = pathname;

    const onPageHide = () => saveScrollPosition(pathname);
    window.addEventListener("pagehide", onPageHide);
    return () => window.removeEventListener("pagehide", onPageHide);
  }, [pathname]);

  /* First mount (fresh document load / hydration) — restore synchronously
     before the browser paints, so there's no flash at scrollY 0. */
  useLayoutEffect(() => {
    if (mounted.current || !isListRestorePath(pathname)) return;
    mounted.current = true;
    restoreScrollPositionSync(pathname);
  }, [pathname]);

  useEffect(() => {
    if (!isListRestorePath(pathname)) return;

    const restore = () => restoreScrollPosition(pathname);

    if (!mounted.current) {
      mounted.current = true;
      requestAnimationFrame(restore);
      return;
    }

    if (prefersReducedMotion()) {
      restore();
      return;
    }

    const id = requestAnimationFrame(() => requestAnimationFrame(restore));
    return () => cancelAnimationFrame(id);
  }, [pathname, navigationEpoch]);

  return <>{children}</>;
}
