"use client";

import { useCallback, useEffect, useRef } from "react";
import {
  analyticsOptedOut,
  getAnonymousSessionHash,
} from "@/lib/analytics/privacy";
import type { AnalyticsSurface, ReaderEventInput } from "@/lib/analytics/types";

const FLUSH_MS = 5000;
const MAX_BUFFER = 24;

export function useAnalyticsCollector() {
  const buffer = useRef<ReaderEventInput[]>([]);
  const sessionHash = useRef<string>("");

  useEffect(() => {
    sessionHash.current = getAnonymousSessionHash();
  }, []);

  const flush = useCallback(async () => {
    if (analyticsOptedOut() || !buffer.current.length) return;

    const batch = buffer.current.splice(0, MAX_BUFFER);

    try {
      await fetch("/api/analytics/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionHash: sessionHash.current,
          events: batch,
        }),
        keepalive: true,
      });
    } catch {
      buffer.current.unshift(...batch);
    }
  }, []);

  useEffect(() => {
    const id = setInterval(() => void flush(), FLUSH_MS);
    const onHide = () => {
      if (document.visibilityState === "hidden") void flush();
    };
    window.addEventListener("pagehide", () => void flush());
    document.addEventListener("visibilitychange", onHide);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onHide);
      void flush();
    };
  }, [flush]);

  const track = useCallback((event: ReaderEventInput) => {
    if (analyticsOptedOut()) return;
    buffer.current.push(event);
    if (buffer.current.length >= MAX_BUFFER) void flush();
  }, [flush]);

  return { track, flush };
}

export type TrackArticleContext = {
  slug: string;
  category?: string;
  region?: string;
  surface?: AnalyticsSurface;
};
