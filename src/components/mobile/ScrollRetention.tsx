"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, type ReactNode } from "react";
import {
  restoreScrollPosition,
  saveScrollPosition,
} from "@/lib/mobile/scroll-retention";
import {
  ROUTE_TOTAL_MS,
  prefersReducedMotion,
} from "@/lib/navigation/transition-config";

type ScrollRetentionProps = {
  children: ReactNode;
};

/** Restore scroll after route transition completes (avoids jump mid-fade) */
export function ScrollRetention({ children }: ScrollRetentionProps) {
  const pathname = usePathname();
  const prevPath = useRef<string | null>(null);

  useEffect(() => {
    const prev = prevPath.current;
    if (prev && prev !== pathname) {
      saveScrollPosition(prev);
    }

    const delay = prefersReducedMotion() ? 0 : ROUTE_TOTAL_MS;
    const timer = window.setTimeout(() => {
      restoreScrollPosition(pathname);
    }, delay);

    prevPath.current = pathname;

    const onPageHide = () => saveScrollPosition(pathname);
    window.addEventListener("pagehide", onPageHide);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("pagehide", onPageHide);
    };
  }, [pathname]);

  return <>{children}</>;
}
