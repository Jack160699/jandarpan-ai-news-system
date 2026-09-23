"use client";

import { useCallback, useRef } from "react";
import { useBroadcast } from "./BroadcastContext";
import type { BroadcastSegment } from "./types";

/**
 * Generates anchor broadcast script for a story segment.
 * Calls /api/broadcast/script and caches by slug+language.
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

      try {
        const res = await fetch("/api/broadcast/script", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: segment.id,
            headline: state.language === "hi" ? (segment.headlineHi || segment.headline) : segment.headline,
            summary: state.language === "hi" ? (segment.summaryHi || segment.summary) : segment.summary,
            section: segment.section,
            language: state.language,
            isBreaking: segment.isBreaking,
            district: state.language === "hi" ? (segment.districtHi || segment.district) : segment.district,
          }),
        });

        if (!res.ok) {
          // Fallback: build a basic script from headline + summary
          const fallback = buildFallbackScript(segment, state.language);
          cacheRef.current.set(cacheKey, fallback);
          dispatch({ type: "SET_SCRIPT", segmentId: segment.id, ...fallback });
          return fallback;
        }

        const data = await res.json() as { script: string; durationSec: number };
        cacheRef.current.set(cacheKey, data);
        dispatch({ type: "SET_SCRIPT", segmentId: segment.id, ...data });
        return data;
      } catch {
        const fallback = buildFallbackScript(segment, state.language);
        cacheRef.current.set(cacheKey, fallback);
        dispatch({ type: "SET_SCRIPT", segmentId: segment.id, ...fallback });
        return fallback;
      }
    },
    [state.language, dispatch]
  );

  return { generateScript };
}

function buildFallbackScript(
  segment: BroadcastSegment,
  lang: "hi" | "en"
): { script: string; durationSec: number } {
  const headline = lang === "hi" ? (segment.headlineHi || segment.headline) : segment.headline;
  const summary = lang === "hi" ? (segment.summaryHi || segment.summary) : segment.summary;
  const location = lang === "hi" ? (segment.districtHi || segment.district || "छत्तीसगढ़") : (segment.district || "Chhattisgarh");

  let script: string;
  if (lang === "hi") {
    script = segment.isBreaking
      ? `ब्रेकिंग न्यूज़। ${location} से बड़ी खबर। ${headline}। ${summary}`
      : `नमस्कार, जन दर्पण लाइव में आपका स्वागत है। ${location} से खबर — ${headline}। ${summary}`;
  } else {
    script = segment.isBreaking
      ? `Breaking news from ${location}. ${headline}. ${summary}`
      : `Welcome to Jan Darpan Live. From ${location} — ${headline}. ${summary}`;
  }

  return { script, durationSec: Math.ceil(script.length / 14) };
}
