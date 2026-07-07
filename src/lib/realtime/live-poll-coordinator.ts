/**
 * Shared live snapshot fetch — dedupe in-flight requests, client TTL cache,
 * offline reuse. Used by useNewsroomPolling and menu briefing.
 */

import { REALTIME_CONFIG, jitteredPollMs } from "@/lib/realtime/config";
import type { LiveHomepageSnapshot, LivePollResult } from "@/lib/realtime/types";

const POLL_TIMEOUT_MS = 25_000;

type SnapshotCache = {
  snapshot: LiveHomepageSnapshot;
  cachedAt: number;
};

let inflight: Promise<LivePollResult> | null = null;
let snapshotCache: SnapshotCache | null = null;
let realtimeBacked = false;

export function setRealtimePollBacked(active: boolean): void {
  realtimeBacked = active;
}

export function isRealtimePollBacked(): boolean {
  return realtimeBacked;
}

export function getCachedLiveSnapshot(): LiveHomepageSnapshot | null {
  if (!snapshotCache) return null;
  if (Date.now() - snapshotCache.cachedAt > REALTIME_CONFIG.clientSnapshotTtlMs) {
    return null;
  }
  return snapshotCache.snapshot;
}

export function clearLiveSnapshotCache(): void {
  snapshotCache = null;
}

function isBrowserOnline(): boolean {
  return typeof navigator === "undefined" || navigator.onLine;
}

async function fetchLiveSnapshotOnce(signal?: AbortSignal): Promise<LivePollResult> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), POLL_TIMEOUT_MS);

  const onAbort = () => controller.abort();
  signal?.addEventListener("abort", onAbort, { once: true });

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
    signal?.removeEventListener("abort", onAbort);
    window.clearTimeout(timer);
  }
}

export type FetchLiveSnapshotOptions = {
  /** Bypass client TTL (realtime events, tab resume, initial load) */
  force?: boolean;
  signal?: AbortSignal;
};

/**
 * Fetch live snapshot with shared in-flight dedupe and client-side TTL cache.
 */
export async function fetchLiveSnapshotShared(
  options: FetchLiveSnapshotOptions = {}
): Promise<LivePollResult> {
  const force = options.force ?? false;

  if (!isBrowserOnline()) {
    const cached = snapshotCache?.snapshot ?? null;
    if (cached) {
      return { ok: true, snapshot: cached };
    }
    return {
      ok: false,
      error: "offline",
      code: "OFFLINE",
      retryable: true,
    };
  }

  if (!force) {
    const cached = getCachedLiveSnapshot();
    if (cached) {
      return { ok: true, snapshot: cached };
    }
  }

  if (inflight) {
    return inflight;
  }

  inflight = fetchLiveSnapshotOnce(options.signal).finally(() => {
    inflight = null;
  });

  const result = await inflight;

  if (result.ok && result.snapshot) {
    snapshotCache = {
      snapshot: result.snapshot,
      cachedAt: Date.now(),
    };
  }

  return result;
}

/** Poll interval — backup when realtime is off; longer when realtime handles pushes */
export function resolvePollIntervalMs(): number {
  if (isRealtimePollBacked()) {
    return jitteredPollMs(
      REALTIME_CONFIG.pollRealtimeMinMs,
      REALTIME_CONFIG.pollRealtimeMaxMs
    );
  }
  return jitteredPollMs();
}
