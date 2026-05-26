"use client";

import { useEffect, useRef } from "react";
import { traceRemount } from "@/lib/observability/remount-trace";

/** Logs once per component mount (dev / ADMIN_DEBUG). */
export function useRemountTrace(
  name: string,
  tag: "ROOT_REMOUNT" | "LAYOUT_REMOUNT" | "PAGE_REMOUNT" | "EDITOR_RERENDER" = "PAGE_REMOUNT"
) {
  const traced = useRef(false);
  useEffect(() => {
    if (traced.current) return;
    traced.current = true;
    traceRemount(tag, name);
  }, [name, tag]);
}
