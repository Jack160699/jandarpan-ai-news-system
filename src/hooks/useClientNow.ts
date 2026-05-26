"use client";

import { useEffect, useState } from "react";

/**
 * Returns current epoch ms only after mount — safe for Date.now() math in render.
 */
export function useClientNow(refreshMs?: number): number | null {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    if (!refreshMs || refreshMs <= 0) return;
    const id = window.setInterval(() => setNow(Date.now()), refreshMs);
    return () => window.clearInterval(id);
  }, [refreshMs]);

  return now;
}
