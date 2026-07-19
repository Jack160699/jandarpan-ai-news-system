"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ADMIN_POLL,
  isDocumentHidden,
  nextBackoffMs,
  notificationsIntervalForTone,
} from "@/lib/admin-v3/admin-poll";

export type AdminNotificationItem = {
  id: string;
  severity: "critical" | "warning" | "info";
  title: string;
  explanation: string;
  source: string;
  timestamp: string;
  href: string;
  unread: boolean;
  dismissible?: boolean;
  actions?: Array<{ id: string; label: string }>;
};

type Cache = {
  items: AdminNotificationItem[];
  unread: number;
  tone: "critical" | "warning" | "neutral";
  checkedAt: number;
  inflight: Promise<void> | null;
  errorAttempts: number;
};

const cache: Cache = {
  items: [],
  unread: 0,
  tone: "neutral",
  checkedAt: 0,
  inflight: null,
  errorAttempts: 0,
};

const listeners = new Set<() => void>();

function notify() {
  for (const l of listeners) l();
}

async function fetchNotifications(force = false): Promise<void> {
  const now = Date.now();
  if (
    !force &&
    cache.checkedAt > 0 &&
    now - cache.checkedAt < ADMIN_POLL.clientStaleMs
  ) {
    return;
  }
  if (cache.inflight) {
    await cache.inflight;
    return;
  }

  cache.inflight = (async () => {
    try {
      const res = await fetch("/api/admin/notifications", {
        credentials: "include",
      });
      const json = await res.json();
      if (!json.ok) {
        cache.errorAttempts += 1;
        return;
      }
      cache.items = Array.isArray(json.items) ? json.items : [];
      cache.unread = Number(json.unread) || 0;
      cache.tone = (json.tone as Cache["tone"]) ?? "neutral";
      cache.checkedAt = Date.now();
      cache.errorAttempts = 0;
      notify();
    } catch {
      cache.errorAttempts += 1;
    } finally {
      cache.inflight = null;
    }
  })();

  await cache.inflight;
}

export function useAdminNotifications() {
  const [items, setItems] = useState(cache.items);
  const [unread, setUnread] = useState(cache.unread);
  const [tone, setTone] = useState(cache.tone);
  const [loading, setLoading] = useState(cache.checkedAt === 0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onUpdate = () => {
      setItems(cache.items);
      setUnread(cache.unread);
      setTone(cache.tone);
    };
    listeners.add(onUpdate);

    let cancelled = false;
    let timer: number | null = null;

    const schedule = () => {
      if (timer != null) window.clearTimeout(timer);
      const delay =
        cache.errorAttempts > 0
          ? nextBackoffMs(cache.errorAttempts)
          : notificationsIntervalForTone(cache.tone);
      timer = window.setTimeout(tick, delay);
    };

    const tick = () => {
      if (cancelled) return;
      if (isDocumentHidden()) {
        schedule();
        return;
      }
      void fetchNotifications(true)
        .then(() => {
          if (!cancelled) setError(null);
        })
        .catch(() => {
          if (!cancelled) setError("Unable to load alerts");
        })
        .finally(() => {
          if (!cancelled) {
            setLoading(false);
            schedule();
          }
        });
    };

    void fetchNotifications(false).finally(() => {
      if (!cancelled) {
        setLoading(false);
        onUpdate();
        schedule();
      }
    });

    const onVisibility = () => {
      if (!isDocumentHidden()) void fetchNotifications(false);
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      listeners.delete(onUpdate);
      if (timer != null) window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  const refresh = useCallback(async (force = true) => {
    setLoading(cache.checkedAt === 0);
    try {
      await fetchNotifications(force);
      setError(null);
    } catch {
      setError("Unable to load alerts");
    } finally {
      setLoading(false);
      setItems(cache.items);
      setUnread(cache.unread);
      setTone(cache.tone);
    }
  }, []);

  const postAction = useCallback(
    async (action: "mark_read" | "acknowledge", id: string) => {
      try {
        await fetch("/api/admin/notifications/actions", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, id }),
        });
      } catch {
        /* local UI still updates */
      }
      await refresh(true);
    },
    [refresh]
  );

  return {
    items,
    unread,
    tone,
    loading,
    error,
    refresh,
    acknowledge: (id: string) => postAction("acknowledge", id),
    markReadRemote: (id: string) => postAction("mark_read", id),
    cacheAgeMs: () => Date.now() - cache.checkedAt,
  };
}
