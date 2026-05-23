"use client";

import { useEffect } from "react";

/** Marks app shell hydrated — enables subtle first-paint fade without mismatch */
export function AppHydration() {
  useEffect(() => {
    const root = document.querySelector(".app-shell");
    if (root) {
      root.setAttribute("data-hydrated", "true");
    }
  }, []);

  return null;
}
