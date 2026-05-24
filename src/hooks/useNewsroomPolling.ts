"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { REALTIME_CONFIG, jitteredPollMs } from "@/lib/realtime/config";
import type { LiveHomepageSnapshot, LivePollResult } from "@/lib/realtime/types";

const POLL_TIMEOUT_MS = 25_000;
const MAX_ATTEMPTS = 3;
const RETRY_BASE_MS = 1_200;

type UseNewsroomPollingOptions = {
  enabled?: boolean;
  onSnapshot: (snapshot: LiveHomepageSnapshot) => void;
  onError?: (error: string) => void;
};

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchLiveSnapshotOnce(): Promise<LivePollResult> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), POLL_TIMEOUT_MS);

  try {
    const res = await fetch("/api/homepage/live", {
      method: "GET",
      cache: "no-store",
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });

    const data = (await res.json()) as LivePollResult;

    if (!res.ok) {
      return data.ok === false
        ? data
        : {
            ok: false,
            error: `http_${res.status}`,
            code: `HTTP_${res.status}`,
            retryable: res.status >= 500 || res.status === 429,
          };
    }

    return data;
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      return {
        ok: false,
        error: "timeout",
        code: "TIMEOUT",
        retryable: true,
      };
    }
    return {
      ok: false,
      error: "network_error",
      code: "NETWORK",
      retryable: true,
    };
  } finally {
    window.clearTimeout(timer);
  }
}

async function fetchLiveSnapshotWithRetry(): Promise<LiveHomepageSnapshot | null> {
  let lastError = "fetch_failed";

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const result = await fetchLiveSnapshotOnce();

    if (result.ok) {
      if (attempt > 0) {
        console.log("[live-poll] recovered after", attempt, "retries");
      }
      if (result.meta?.rateLimited) {
        console.warn("[live-poll] upstream rate limited — showing cached/wire content");
      }
      return result.snapshot;
    }

    lastError = result.error;
    const retryable = result.retryable !== false;

    console.warn("[live-poll] attempt failed", {
      attempt: attempt + 1,
      error: result.error,
      code: result.code,
      retryable,
      meta: result.meta,
    });

    if (!retryable || attempt >= MAX_ATTEMPTS - 1) break;
    await sleep(RETRY_BASE_MS * (attempt + 1));
  }

  console.error("[live-poll] all attempts failed:", lastError);
  return null;
}

/**
 * Background polling with visibility pause, jitter, debounced triggers, retry + timeout.
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
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    onSnapshotRef.current = onSnapshot;
    onErrorRef.current = onError;
  }, [onSnapshot, onError]);

  const poll = useCallback(async (force = false) => {
    if (!enabled || inflightRef.current) return;
    if (typeof document !== "undefined" && document.hidden && !force) return;

    inflightRef.current = true;
    setIsSyncing(true);
    try {
      const snapshot = await fetchLiveSnapshotWithRetry();
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
      setIsSyncing(false);
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

  return { pollNow: () => poll(true), triggerPoll: schedulePoll, isSyncing };
}
