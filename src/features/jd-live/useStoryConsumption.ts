"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useReaderAccount } from "@/providers/ReaderAccountProvider";

export interface StoryConsumptionState {
  read: boolean;
  played: boolean;
  consumed: boolean;
  first_consumed_at: string | null;
  last_consumed_at: string | null;
}

const STORAGE_KEY = "jd_consumed_stories_v1";
const BROADCAST_CHANNEL_NAME = "jd_consumption_channel";

// Memory cache for immediate synchronous reads
let memoryCache: Record<string, StoryConsumptionState> = {};

function loadLocalConsumption(): Record<string, StoryConsumptionState> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === "object" && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

function saveLocalConsumption(map: Record<string, StoryConsumptionState>): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {}
}

export function useStoryConsumption(storyIds: string[] = []) {
  const { user } = useReaderAccount();
  const userId =
    user?.id ||
    (typeof window !== "undefined"
      ? localStorage.getItem("jd_anon_uid") || "anon_reader"
      : "anon_reader");

  const [consumptionMap, setConsumptionMap] = useState<Record<string, StoryConsumptionState>>(() => {
    if (Object.keys(memoryCache).length > 0) return memoryCache;
    const local = loadLocalConsumption();
    memoryCache = local;
    return local;
  });

  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);
  const fetchedIdsRef = useRef<Set<string>>(new Set());

  // Setup multi-tab sync via BroadcastChannel & storage events (Requirement #37)
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      if ("BroadcastChannel" in window) {
        const bc = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
        broadcastChannelRef.current = bc;
        bc.onmessage = (event) => {
          if (event.data?.type === "STORY_CONSUMED" && event.data?.storyId) {
            const storyId = event.data.storyId;
            setConsumptionMap((prev) => {
              const next = {
                ...prev,
                [storyId]: {
                  read: true,
                  played: true,
                  consumed: true,
                  first_consumed_at: prev[storyId]?.first_consumed_at || new Date().toISOString(),
                  last_consumed_at: new Date().toISOString(),
                },
              };
              memoryCache = next;
              return next;
            });
          }
        };
      }
    } catch {}

    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          memoryCache = parsed;
          setConsumptionMap(parsed);
        } catch {}
      }
    };
    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener("storage", handleStorage);
      if (broadcastChannelRef.current) {
        broadcastChannelRef.current.close();
      }
    };
  }, []);

  // Fetch authoritative consumption state from server (batch query)
  const fetchRemoteConsumption = useCallback(
    async (ids: string[]) => {
      if (!userId || ids.length === 0) return;
      const uncached = ids.filter((id) => !fetchedIdsRef.current.has(id));
      if (uncached.length === 0) return;

      try {
        const res = await fetch(
          `/api/story/consumption?userId=${encodeURIComponent(userId)}&storyIds=${encodeURIComponent(
            uncached.join(",")
          )}`
        );
        if (!res.ok) return;
        const json = await res.json();
        if (json.ok && json.data) {
          setConsumptionMap((prev) => {
            const next = { ...prev };
            for (const [sId, rec] of Object.entries(json.data as Record<string, StoryConsumptionState>)) {
              next[sId] = {
                read: Boolean(rec.read || prev[sId]?.read),
                played: Boolean(rec.played || prev[sId]?.played),
                consumed: Boolean(rec.consumed || prev[sId]?.consumed),
                first_consumed_at: rec.first_consumed_at || prev[sId]?.first_consumed_at || null,
                last_consumed_at: rec.last_consumed_at || prev[sId]?.last_consumed_at || null,
              };
            }
            memoryCache = next;
            saveLocalConsumption(next);
            return next;
          });
          uncached.forEach((id) => fetchedIdsRef.current.add(id));
        }
      } catch (err) {
        console.warn("[useStoryConsumption] Failed to fetch remote consumption:", err);
      }
    },
    [userId]
  );

  useEffect(() => {
    if (storyIds.length > 0) {
      void fetchRemoteConsumption(storyIds);
    }
  }, [storyIds, fetchRemoteConsumption]);

  // Record story consumption (Optimistic UI + Server Authoritative persistence)
  const markConsumed = useCallback(
    async (storyId: string) => {
      if (!storyId) return;

      const nowIso = new Date().toISOString();

      // 1. Optimistic local update
      setConsumptionMap((prev) => {
        const next = {
          ...prev,
          [storyId]: {
            read: true,
            played: true,
            consumed: true,
            first_consumed_at: prev[storyId]?.first_consumed_at || nowIso,
            last_consumed_at: nowIso,
          },
        };
        memoryCache = next;
        saveLocalConsumption(next);
        return next;
      });

      // 2. Multi-tab broadcast
      try {
        broadcastChannelRef.current?.postMessage({
          type: "STORY_CONSUMED",
          storyId,
          timestamp: nowIso,
        });
      } catch {}

      // 3. Server persistence
      try {
        const uid =
          user?.id ||
          (typeof window !== "undefined"
            ? localStorage.getItem("jd_anon_uid") || "anon_reader"
            : "anon_reader");

        void fetch("/api/story/consumption", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: uid,
            storyId,
            action: "consumed",
          }),
        }).catch((err) => {
          console.warn("[useStoryConsumption] Failed to persist consumption:", err);
        });
      } catch {}
    },
    [user?.id]
  );

  const markRead = useCallback(
    async (storyId: string) => {
      await markConsumed(storyId);
    },
    [markConsumed]
  );

  const markPlayed = useCallback(
    async (storyId: string) => {
      if (!storyId) return;
      const nowIso = new Date().toISOString();
      setConsumptionMap((prev) => {
        const next = {
          ...prev,
          [storyId]: {
            read: prev[storyId]?.read || false,
            played: true,
            consumed: prev[storyId]?.consumed || false,
            first_consumed_at: prev[storyId]?.first_consumed_at || null,
            last_consumed_at: prev[storyId]?.last_consumed_at || null,
          },
        };
        memoryCache = next;
        saveLocalConsumption(next);
        return next;
      });

      try {
        const uid =
          user?.id ||
          (typeof window !== "undefined"
            ? localStorage.getItem("jd_anon_uid") || "anon_reader"
            : "anon_reader");

        void fetch("/api/story/consumption", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: uid,
            storyId,
            action: "played",
          }),
        }).catch(() => {});
      } catch {}
    },
    [user?.id]
  );

  const consumedIds = useMemo(() => {
    const s = new Set<string>();
    for (const [id, rec] of Object.entries(consumptionMap)) {
      if (rec.consumed) s.add(id);
    }
    return s;
  }, [consumptionMap]);

  return {
    consumptionMap,
    consumedIds,
    markConsumed,
    markRead,
    markPlayed,
  };
}
