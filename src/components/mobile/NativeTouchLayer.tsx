"use client";

import { useEffect, type ReactNode } from "react";
import { breakpointQueries } from "@/design-system/tokens/breakpoints";

/** Enables native-app document classes on mobile viewports */
export function NativeTouchLayer({ children }: { children: ReactNode }) {
  useEffect(() => {
    const mq = window.matchMedia(breakpointQueries.mobile);
    const apply = () => {
      document.documentElement.classList.toggle("native-app", mq.matches);
    };
    apply();
    mq.addEventListener("change", apply);
    return () => {
      mq.removeEventListener("change", apply);
      document.documentElement.classList.remove("native-app");
    };
  }, []);

  return <>{children}</>;
}
