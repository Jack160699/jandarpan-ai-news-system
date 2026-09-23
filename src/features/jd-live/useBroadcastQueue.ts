"use client";

import { useCallback, useEffect, useRef } from "react";
import type { BroadcastSegment } from "./types";
import { useBroadcast } from "./BroadcastContext";

/**
 * Fetches broadcast feed and populates the queue.
 * Refetches every 60s to pick up new stories.
 */
export function useBroadcastQueue() {
  const { state, dispatch } = useBroadcast();
  const lastFetchRef = useRef<number>(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchFeed = useCallback(async () => {
    try {
      const res = await fetch("/api/broadcast/feed", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json() as { queue: BroadcastSegment[]; breaking: BroadcastSegment[] };
      lastFetchRef.current = Date.now();
      dispatch({ type: "SET_QUEUE", queue: data.queue, breaking: data.breaking });
    } catch {
      // Silently ignore — keep existing queue
    }
  }, [dispatch]);

  // Initial fetch
  useEffect(() => {
    void fetchFeed();
  }, [fetchFeed]);

  // Periodic refresh every 60s
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      void fetchFeed();
    }, 60_000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchFeed]);

  // Auto-advance segments when playback ends
  const advanceAfterSegment = useCallback(
    (durationMs: number) => {
      return setTimeout(() => {
        dispatch({ type: "NEXT_SEGMENT" });
      }, durationMs);
    },
    [dispatch]
  );

  return {
    queue: state.queue,
    breakingQueue: state.breakingQueue,
    currentSegment: state.currentSegment,
    advanceAfterSegment,
  };
}
