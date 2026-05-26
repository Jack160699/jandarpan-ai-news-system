"use client";

import { useEffect } from "react";
import { traceHydrationSafe } from "@/lib/observability/hydration-trace";

/** Logs [HYDRATION_SAFE] once after mount — confirms no SSR/client text mismatch for this subtree. */
export function useHydrationSafe(scope: string): void {
  useEffect(() => {
    traceHydrationSafe(scope);
  }, [scope]);
}
