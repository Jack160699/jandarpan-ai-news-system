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

  const playedIdsRef = useRef(state.playedIds);
  playedIdsRef.current = state.playedIds;

  const playedBreakingIdsRef = useRef(state.playedBreakingIds);
  playedBreakingIdsRef.current = state.playedBreakingIds;

  const sessionSeedRef = useRef(state.sessionSeed);
  sessionSeedRef.current = state.sessionSeed;

  const modeRef = useRef(state.mode);
  modeRef.current = state.mode;

  const currentSegmentRef = useRef(state.currentSegment);
  currentSegmentRef.current = state.currentSegment;

  const fetchFeed = useCallback(async () => {
    try {
      const recentExclude = playedIdsRef.current.slice(-20).join(",");
      const url = `/api/broadcast/feed?lang=${state.language}&seed=${encodeURIComponent(sessionSeedRef.current)}&exclude=${encodeURIComponent(recentExclude)}`;
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json() as { queue: BroadcastSegment[]; breaking: BroadcastSegment[] };
      lastFetchRef.current = Date.now();

      // Only interrupt with breaking news if it's a story we haven't already presented this session
      if (data.breaking && data.breaking.length > 0 && modeRef.current !== "breaking") {
        const latestBreaking = data.breaking[0];
        const alreadyPlayed = playedBreakingIdsRef.current.includes(latestBreaking.id);
        const isCurrent = latestBreaking.id === currentSegmentRef.current?.id;
        if (!alreadyPlayed && !isCurrent) {
          dispatch({ type: "INTERRUPT_BREAKING", segment: latestBreaking });
          return;
        }
      }

      dispatch({ type: "SET_QUEUE", queue: data.queue, breaking: data.breaking });
    } catch {
      // Silently ignore — keep existing queue
    }
  }, [dispatch, state.language]);

  // Initial fetch and refetch on language change
  useEffect(() => {
    void fetchFeed();
  }, [fetchFeed, state.language]);

  // Periodic refresh every 60s to incorporate newly published 48-hour news
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

  const advanceToNext = useCallback(() => {
    dispatch({ type: "NEXT_SEGMENT" });
  }, [dispatch]);

  return {
    queue: state.queue,
    breakingQueue: state.breakingQueue,
    currentSegment: state.currentSegment,
    advanceAfterSegment,
  };
}
