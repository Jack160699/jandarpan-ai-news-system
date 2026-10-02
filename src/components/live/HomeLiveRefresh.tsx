"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Refresh homepage server data for the live wire. Every refresh is a server render, so the interval is a direct cost: 5 min
 * (was 60 s) and only while the tab is visible -- a background tab must not keep re-rendering the page.
 */
const REFRESH_MS = 300_000;

export function HomeLiveRefresh() {
  const router = useRouter();

  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, REFRESH_MS);

    return () => clearInterval(interval);
  }, [router]);

  return null;
}
