"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { SCROLL_POSITIONS_KEY } from "../constants";

type ScrollMap = Record<string, number>;

function readMap(): ScrollMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = sessionStorage.getItem(SCROLL_POSITIONS_KEY);
    return raw ? (JSON.parse(raw) as ScrollMap) : {};
  } catch {
    return {};
  }
}

function writeMap(map: ScrollMap) {
  try {
    sessionStorage.setItem(SCROLL_POSITIONS_KEY, JSON.stringify(map));
  } catch {
    /* ignore */
  }
}

/** Remember and restore scroll position per route */
export function useScrollPosition(enabled = true) {
  const pathname = usePathname();
  const restored = useRef(false);

  useEffect(() => {
    if (!enabled) return;
    restored.current = false;
    const map = readMap();
    const y = map[pathname];
    if (typeof y === "number" && y > 0) {
      requestAnimationFrame(() => {
        window.scrollTo({ top: y, behavior: "instant" as ScrollBehavior });
        restored.current = true;
      });
    }

    return () => {
      const current = window.scrollY;
      const next = readMap();
      next[pathname] = current;
      writeMap(next);
    };
  }, [pathname, enabled]);
}
