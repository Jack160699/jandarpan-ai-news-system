"use client";

import { useCallback, useEffect, useState } from "react";
import {
  SIDEBAR_STORAGE_KEY,
  shellDimensions,
} from "../constants";
import type { SidebarState } from "../types";

function readStored(): SidebarState {
  if (typeof window === "undefined") {
    return {
      collapsed: false,
      width: shellDimensions.sidebarExpanded,
    };
  }
  try {
    const raw = localStorage.getItem(SIDEBAR_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as SidebarState;
      return {
        collapsed: Boolean(parsed.collapsed),
        width: Math.min(
          shellDimensions.sidebarMax,
          Math.max(shellDimensions.sidebarMin, parsed.width ?? shellDimensions.sidebarExpanded)
        ),
      };
    }
  } catch {
    /* ignore */
  }
  return { collapsed: false, width: shellDimensions.sidebarExpanded };
}

export function useSidebarState() {
  const [sidebar, setSidebar] = useState<SidebarState>(readStored);

  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_STORAGE_KEY, JSON.stringify(sidebar));
    } catch {
      /* ignore */
    }
  }, [sidebar]);

  const setSidebarCollapsed = useCallback((collapsed: boolean) => {
    setSidebar((s) => ({ ...s, collapsed }));
  }, []);

  const setSidebarWidth = useCallback((width: number) => {
    const clamped = Math.min(
      shellDimensions.sidebarMax,
      Math.max(shellDimensions.sidebarMin, width)
    );
    setSidebar((s) => ({ ...s, width: clamped, collapsed: false }));
  }, []);

  const toggleSidebar = useCallback(() => {
    setSidebar((s) => ({ ...s, collapsed: !s.collapsed }));
  }, []);

  return { sidebar, setSidebarCollapsed, setSidebarWidth, toggleSidebar };
}
