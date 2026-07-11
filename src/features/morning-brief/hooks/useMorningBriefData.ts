"use client";

import { useMemo } from "react";
import type { MorningBriefData } from "../types";
import { MORNING_BRIEF_PLACEHOLDER } from "../data/placeholders";

export type UseMorningBriefDataOptions = {
  /** Override placeholder data (e.g. from homepage feed later). */
  data?: Partial<MorningBriefData>;
};

export function useMorningBriefData(options: UseMorningBriefDataOptions = {}) {
  return useMemo(
    () => ({
      ...MORNING_BRIEF_PLACEHOLDER,
      ...options.data,
    }),
    [options.data]
  );
}
