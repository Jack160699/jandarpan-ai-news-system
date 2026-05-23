"use client";

import { useCallback } from "react";
import {
  triggerHaptic,
  type HapticPattern,
} from "@/lib/mobile/haptics";

export function useHaptic() {
  return useCallback((pattern: HapticPattern = "light") => {
    triggerHaptic(pattern);
  }, []);
}
