"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// 5 min (was 60 s) and only while visible: each refresh is a server render.
const REFRESH_MS = 300_000;

/** Soft refresh + flash cue for live desk feeds */
export function LiveDeskRefresh() {
  const router = useRouter();

  useEffect(() => {
    const tick = () => {
      if (document.visibilityState !== "visible") return;
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
