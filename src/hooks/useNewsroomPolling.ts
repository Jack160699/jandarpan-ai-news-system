"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { REALTIME_CONFIG } from "@/lib/realtime/config";
import {
  fetchLiveSnapshotShared,
  resolvePollIntervalMs,
} from "@/lib/realtime/live-poll-coordinator";
import type { LiveHomepageSnapshot } from "@/lib/realtime/types";

const MAX_ATTEMPTS = 3;
const RETRY_BASE_MS = 1_200;
const DEV_POLL_LOGS = process.env.NODE_ENV !== "production";

type UseNewsroomPollingOptions = {
  enabled?: boolean;
  onSnapshot: (snapshot: LiveHomepageSnapshot) => void;
  onError?: (error: string) => void;
};

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function isBrowserOnline(): boolean {
  return typeof navigator === "undefined" || navigator.onLine;
}

function isTabVisible(): boolean {
  return typeof document === "undefined" || !document.hidden;
}

async function fetchLiveSnapshotWithRetry(
  force: boolean
): Promise<LiveHomepageSnapshot | null> {
  let lastError = "fetch_failed";

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const result = await fetchLiveSnapshotShared({
      force: force && attempt === 0,
    });

    if (result.ok) {
      if (DEV_POLL_LOGS && attempt > 0) {
        console.log("[live-poll] recovered after", attempt, "retries");
      }
      if (DEV_POLL_LOGS && result.meta?.rateLimited) {
        console.warn(
          "[live-poll] upstream rate limited — showing cached/wire content"
        );
      }
      return result.snapshot;
    }

    if (result.code === "OFFLINE") {
      return null;
    }

    lastError = result.error;
    const retryable = result.retryable !== false;

    if (DEV_POLL_LOGS) {
      console.warn("[live-poll] attempt failed", {
        attempt: attempt + 1,
        error: result.error,
        code: result.code,
        retryable,
        meta: result.meta,
      });
    }

    if (!retryable || attempt >= MAX_ATTEMPTS - 1) break;
    await sleep(RETRY_BASE_MS * (attempt + 1));
  }

  if (DEV_POLL_LOGS) {
    console.warn("[live-poll] all attempts failed:", lastError);
  }
  return null;
}

/**
 * Background polling with visibility/offline pause, shared fetch dedupe,
 * client snapshot reuse, adaptive interval, and debounced realtime triggers.
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
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const versionRef = useRef<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    onSnapshotRef.current = onSnapshot;
    onErrorRef.current = onError;
  }, [onSnapshot, onError]);

  const poll = useCallback(async (forceFetch = false) => {
    if (!enabled || inflightRef.current) return;
    if (!isTabVisible() && !forceFetch) return;
    if (!isBrowserOnline()) return;

    inflightRef.current = true;
    setIsSyncing(true);
    try {
      const snapshot = await fetchLiveSnapshotWithRetry(forceFetch);
      if (!snapshot) {
        if (isBrowserOnline()) {
          onErrorRef.current?.("fetch_failed");
        }
        return;
      }
      if (!forceFetch && snapshot.version === versionRef.current) return;
      versionRef.current = snapshot.version;
      onSnapshotRef.current(snapshot);
    } catch {
      if (isBrowserOnline()) {
        onErrorRef.current?.("network_error");
      }
    } finally {
      inflightRef.current = false;
      setIsSyncing(false);
    }
  }, [enabled]);

  const schedulePoll = useCallback(
    (delayMs?: number, forceFetch = false) => {
      if (!enabled) return;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        void poll(forceFetch);
      }, delayMs ?? REALTIME_CONFIG.debounceMs);
    },
    [enabled, poll]
  );

  useEffect(() => {
    if (!enabled) return;

    const clearPollTimer = () => {
      if (pollTimerRef.current) {
        clearTimeout(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };

    const scheduleNextIntervalPoll = () => {
      clearPollTimer();
      if (!isTabVisible() || !isBrowserOnline()) return;

      pollTimerRef.current = setTimeout(() => {
        void poll(false).finally(() => {
          scheduleNextIntervalPoll();
        });
      }, resolvePollIntervalMs());
    };

    const onVisibility = () => {
      if (document.hidden) {
        clearPollTimer();
        return;
      }
      void poll(true);
      scheduleNextIntervalPoll();
    };

    const onOnline = () => {
      void poll(true);
      scheduleNextIntervalPoll();
    };

    const onOffline = () => {
      clearPollTimer();
    };

    if (isTabVisible() && isBrowserOnline()) {
      void poll(true);
      scheduleNextIntervalPoll();
    }

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    return () => {
      clearPollTimer();
      if (debounceRef.current) clearTimeout(debounceRef.current);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, [enabled, poll]);

  return {
    pollNow: () => poll(true),
    triggerPoll: schedulePoll,
    isSyncing,
  };
}
