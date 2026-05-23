"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const REFRESH_MS = 60_000;

/** Soft refresh + flash cue for live desk feeds */
export function LiveDeskRefresh() {
  const router = useRouter();

  useEffect(() => {
    const tick = () => {
      document.documentElement.setAttribute("data-live-refresh", "1");
      router.refresh();
      window.setTimeout(() => {
        document.documentElement.removeAttribute("data-live-refresh");
      }, 700);
    };

    const interval = window.setInterval(tick, REFRESH_MS);
    return () => window.clearInterval(interval);
  }, [router]);

  return null;
}
