"use client";

import { useCallback, useRef } from "react";
import { useBroadcast } from "./BroadcastContext";
import type { BroadcastSegment } from "./types";
import { generateAnchorSpokenScript } from "@/lib/broadcast/anchor-script-engine";

/**
 * Generates anchor broadcast script for a story segment.
 * Calls /api/broadcast/script with natural script engine fallback, cached by story ID + language.
 * Strictly eliminates all story numbering.
 */
export function useBroadcastScript() {
  const { state, dispatch } = useBroadcast();
  const cacheRef = useRef<Map<string, { script: string; durationSec: number }>>(new Map());

  const generateScript = useCallback(
    async (segment: BroadcastSegment): Promise<{ script: string; durationSec: number } | null> => {
      const cacheKey = `${segment.id}:${state.language}`;
      const cached = cacheRef.current.get(cacheKey);
      if (cached) {
        dispatch({
          type: "SET_SCRIPT",
          segmentId: segment.id,
          script: cached.script,
          durationSec: cached.durationSec,
        });
        return cached;
      }

      const headline = state.language === "hi" ? (segment.headlineHi || segment.headline) : segment.headline;
      const summary = state.language === "hi" ? (segment.summaryHi || segment.summary) : segment.summary;
      const district = state.language === "hi" ? (segment.districtHi || segment.district) : segment.district;

      // Instant natural fallback generation
      const localResult = generateAnchorSpokenScript({
        headline,
        summary,
        district,
        section: segment.section,
        categoryLabel: segment.categoryLabel,
        isBreaking: segment.isBreaking,
        language: state.language,
      });

      // If segment already has a valid script without numbers, use it
      if (segment.script && !segment.script.includes("नंबर ") && !segment.script.includes("Story number")) {
        const res = { script: segment.script, durationSec: segment.durationSec || localResult.durationSec };
        cacheRef.current.set(cacheKey, res);
        return res;
      }

      cacheRef.current.set(cacheKey, localResult);
      dispatch({ type: "SET_SCRIPT", segmentId: segment.id, ...localResult });
      return localResult;
    },
    [state.language, dispatch]
  );

  return { generateScript };
}
