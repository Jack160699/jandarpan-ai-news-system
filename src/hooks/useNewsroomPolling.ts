"use client";

import { useCallback, useEffect, useRef } from "react";
import { REALTIME_CONFIG, jitteredPollMs } from "@/lib/realtime/config";
import type { LiveHomepageSnapshot, LivePollResult } from "@/lib/realtime/types";

type UseNewsroomPollingOptions = {
  enabled?: boolean;
  onSnapshot: (snapshot: LiveHomepageSnapshot) => void;
  onError?: (error: string) => void;
};

async function fetchLiveSnapshot(): Promise<LiveHomepageSnapshot | null> {
  const res = await fetch("/api/homepage/live", {
    method: "GET",
    cache: "no-store",
    headers: { Accept: "application/json" },
  });
  if (!res.ok) return null;
  const data = (await res.json()) as LivePollResult;
  if (!data.ok) return null;
  return data.snapshot;
}

/**
 * Background polling with visibility pause, jitter, and debounced triggers.
 */
export function useNewsroomPolling({
  enabled = true,
  onSnapshot,
  onError,
}: UseNewsroomPollingOptions) {
  const onSnapshotRef = useRef(onSnapshot);
  const onErrorRef = useRef(onError);
  const inflightRef = useRef(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const versionRef = useRef<string | null>(null);

  useEffect(() => {
    onSnapshotRef.current = onSnapshot;
    onErrorRef.current = onError;
  }, [onSnapshot, onError]);

  const poll = useCallback(async (force = false) => {
    if (!enabled || inflightRef.current) return;
    if (typeof document !== "undefined" && document.hidden && !force) return;

    inflightRef.current = true;
    try {
      const snapshot = await fetchLiveSnapshot();
      if (!snapshot) {
        onErrorRef.current?.("fetch_failed");
        return;
      }
      if (!force && snapshot.version === versionRef.current) return;
      versionRef.current = snapshot.version;
      onSnapshotRef.current(snapshot);
    } catch {
      onErrorRef.current?.("network_error");
    } finally {
      inflightRef.current = false;
    }
  }, [enabled]);

  const schedulePoll = useCallback(
    (delayMs?: number) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        void poll();
      }, delayMs ?? REALTIME_CONFIG.debounceMs);
    },
    [poll]
  );

  useEffect(() => {
    if (!enabled) return;

    let intervalId: ReturnType<typeof setInterval> | null = null;
    const scheduleInterval = () => {
      if (intervalId) clearInterval(intervalId);
      intervalId = setInterval(() => {
        if (!document.hidden) void poll();
      }, jitteredPollMs());
    };

    const onVisibility = () => {
      if (!document.hidden) {
        schedulePoll();
        scheduleInterval();
      }
    };

    void poll(true);
    scheduleInterval();
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      if (intervalId) clearInterval(intervalId);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [enabled, poll, schedulePoll]);

  return { pollNow: () => poll(true), triggerPoll: schedulePoll };
}
