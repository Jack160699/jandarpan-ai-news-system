"use client";

import { useCallback, useEffect, useState } from "react";
import type { CanonicalHealthSnapshot } from "@/lib/admin-v3/canonical-health";
import {
  ADMIN_POLL,
  isDocumentHidden,
  nextBackoffMs,
  statusIntervalForState,
} from "@/lib/admin-v3/admin-poll";

type ExtendedSnapshot = CanonicalHealthSnapshot & {
  generatedAt?: string;
  lastSuccessfulAt?: string | null;
  freshness?: string;
  usedLastKnown?: boolean;
};

type CacheEntry = {
  snapshot: ExtendedSnapshot | null;
  checkedAt: number;
  inflight: Promise<ExtendedSnapshot | null> | null;
  errorAttempts: number;
};

const cache: CacheEntry = {
  snapshot: null,
  checkedAt: 0,
  inflight: null,
  errorAttempts: 0,
};

const listeners = new Set<() => void>();

function notify() {
  for (const l of listeners) l();
}

async function fetchSnapshot(force = false): Promise<ExtendedSnapshot | null> {
  const now = Date.now();
  if (
    !force &&
    cache.snapshot &&
    now - cache.checkedAt < ADMIN_POLL.clientStaleMs
  ) {
    return cache.snapshot;
  }
  if (cache.inflight) return cache.inflight;

  cache.inflight = (async () => {
    try {
      const res = await fetch("/api/admin/system-status", {
        credentials: "include",
      });
      if (!res.ok) {
        cache.errorAttempts += 1;
        return cache.snapshot;
      }
      const json = await res.json();
      if (json.snapshot) {
        cache.snapshot = json.snapshot as ExtendedSnapshot;
        cache.checkedAt = Date.now();
        cache.errorAttempts = 0;
        notify();
      }
      return cache.snapshot;
    } catch {
      cache.errorAttempts += 1;
      return cache.snapshot;
    } finally {
      cache.inflight = null;
    }
  })();

  return cache.inflight;
}

/** Shared module fetch — used by Platform Health to avoid duplicate status calls. */
export function fetchSharedCanonicalStatus(force = false) {
  return fetchSnapshot(force);
}

export function peekSharedCanonicalStatus(): ExtendedSnapshot | null {
  return cache.snapshot;
}

/** Seed from overview/daily platform block so shell + page share one snapshot. */
export function seedSharedCanonicalStatus(
  snapshot: ExtendedSnapshot | null | undefined
): void {
  if (!snapshot?.state) return;
  cache.snapshot = {
    ...snapshot,
    checkedAt: snapshot.checkedAt || new Date().toISOString(),
  };
  cache.checkedAt = Date.now();
  cache.errorAttempts = 0;
  notify();
}

export function useCanonicalStatus() {
  const [snapshot, setSnapshot] = useState<ExtendedSnapshot | null>(
    () => cache.snapshot
  );
  const [loading, setLoading] = useState(!cache.snapshot);

  useEffect(() => {
    const onUpdate = () => setSnapshot(cache.snapshot);
    listeners.add(onUpdate);
    let cancelled = false;
    let timer: number | null = null;

    const schedule = () => {
      if (timer != null) window.clearTimeout(timer);
      const delay =
        cache.errorAttempts > 0
          ? nextBackoffMs(cache.errorAttempts)
          : statusIntervalForState(cache.snapshot?.state);
      timer = window.setTimeout(tick, delay);
    };

    const tick = () => {
      if (cancelled) return;
      if (isDocumentHidden()) {
        schedule();
        return;
      }
      void fetchSnapshot(true).finally(() => {
        if (!cancelled) schedule();
      });
    };

    void (async () => {
      if (!cache.snapshot) setLoading(true);
      const next = await fetchSnapshot(false);
      if (!cancelled) {
        setSnapshot(next);
        setLoading(false);
        schedule();
      }
    })();

    const onVisibility = () => {
      if (!isDocumentHidden()) void fetchSnapshot(false);
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      listeners.delete(onUpdate);
      if (timer != null) window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  const refresh = useCallback(async () => {
    setLoading(!cache.snapshot);
    const next = await fetchSnapshot(true);
    setSnapshot(next);
    setLoading(false);
    return next;
  }, []);

  return {
    snapshot,
    loading: loading && !snapshot,
    refreshing: loading && Boolean(snapshot),
    refresh,
    state: snapshot?.state ?? "unknown",
    label:
      snapshot?.label ??
      (loading && !snapshot ? "Checking…" : "Production · Unknown"),
    freshness: snapshot?.freshness,
    usedLastKnown: snapshot?.usedLastKnown,
    lastSuccessfulAt: snapshot?.lastSuccessfulAt,
  };
}
