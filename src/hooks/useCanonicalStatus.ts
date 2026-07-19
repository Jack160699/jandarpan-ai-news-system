"use client";

import { useCallback, useEffect, useState } from "react";
import type { CanonicalHealthSnapshot } from "@/lib/admin-v3/canonical-health";

type CacheEntry = {
  snapshot: CanonicalHealthSnapshot | null;
  checkedAt: number;
  inflight: Promise<CanonicalHealthSnapshot | null> | null;
};

const cache: CacheEntry = {
  snapshot: null,
  checkedAt: 0,
  inflight: null,
};

const STALE_MS = 45_000;
const listeners = new Set<() => void>();

function notify() {
  for (const l of listeners) l();
}

async function fetchSnapshot(force = false): Promise<CanonicalHealthSnapshot | null> {
  const now = Date.now();
  if (!force && cache.snapshot && now - cache.checkedAt < STALE_MS) {
    return cache.snapshot;
  }
  if (cache.inflight) return cache.inflight;

  cache.inflight = (async () => {
    try {
      const res = await fetch("/api/admin/system-status", { credentials: "include" });
      if (!res.ok) return cache.snapshot;
      const json = await res.json();
      if (json.snapshot) {
        cache.snapshot = json.snapshot as CanonicalHealthSnapshot;
        cache.checkedAt = Date.now();
        notify();
      }
      return cache.snapshot;
    } catch {
      return cache.snapshot;
    } finally {
      cache.inflight = null;
    }
  })();

  return cache.inflight;
}

export function useCanonicalStatus() {
  const [snapshot, setSnapshot] = useState<CanonicalHealthSnapshot | null>(
    () => cache.snapshot
  );
  const [loading, setLoading] = useState(!cache.snapshot);

  useEffect(() => {
    const onUpdate = () => setSnapshot(cache.snapshot);
    listeners.add(onUpdate);
    let cancelled = false;

    void (async () => {
      if (!cache.snapshot) setLoading(true);
      const next = await fetchSnapshot(false);
      if (!cancelled) {
        setSnapshot(next);
        setLoading(false);
      }
    })();

    const id = window.setInterval(() => {
      void fetchSnapshot(true);
    }, 60_000);

    return () => {
      cancelled = true;
      listeners.delete(onUpdate);
      window.clearInterval(id);
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
    state: snapshot?.state ?? (loading ? "unknown" : "unknown"),
    label: snapshot?.label ?? (loading && !snapshot ? "Checking…" : "Production · Unknown"),
  };
}
