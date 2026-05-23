"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, type ReactNode } from "react";
import {
  restoreScrollPosition,
  saveScrollPosition,
} from "@/lib/mobile/scroll-retention";

type ScrollRetentionProps = {
  children: ReactNode;
};

/** Restore scroll when returning to a feed route within the same session */
export function ScrollRetention({ children }: ScrollRetentionProps) {
  const pathname = usePathname();
  const prevPath = useRef<string | null>(null);

  useEffect(() => {
    const prev = prevPath.current;
    if (prev && prev !== pathname) {
      saveScrollPosition(prev);
    }
    restoreScrollPosition(pathname);
    prevPath.current = pathname;

    const onPageHide = () => saveScrollPosition(pathname);
    window.addEventListener("pagehide", onPageHide);
    return () => window.removeEventListener("pagehide", onPageHide);
  }, [pathname]);

  return <>{children}</>;
}
