"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { usePlace } from "@/providers/PlaceProvider";

type LiveContextValue = {
  /** True when a live thread exists for the reader's current place. */
  liveInPlace: boolean;
};

const LiveContext = createContext<LiveContextValue>({ liveInPlace: false });

const POLL_NORMAL_MS = 15_000;
const POLL_SLOW_MS = 30_000;

type NetworkInformation = { effectiveType?: string };

function getPollIntervalMs(): number {
  if (typeof navigator === "undefined") return POLL_NORMAL_MS;
  const connection = (navigator as Navigator & { connection?: NetworkInformation })
    .connection;
  const effectiveType = connection?.effectiveType;
  return effectiveType === "2g" || effectiveType === "slow-2g"
    ? POLL_SLOW_MS
    : POLL_NORMAL_MS;
}

/**
 * Place-scoped "is anything live right now" signal for the bottom-nav badge.
 *
 * Note: the breaking-news endpoint isn't district-filterable server-side today,
 * so this re-polls on place change but reflects "live anywhere" rather than a
 * true per-district feed until that backend field exists.
 */
export function LiveProvider({ children }: { children: ReactNode }) {
  const place = usePlace();
  const [liveInPlace, setLiveInPlace] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    async function poll() {
      try {
        const res = await fetch("/api/newsroom/breaking?limit=1", {
          cache: "no-store",
        });
        if (res.ok) {
          const data = (await res.json()) as { items?: unknown[] };
          if (!cancelled) {
            setLiveInPlace(Array.isArray(data.items) && data.items.length > 0);
          }
        }
      } catch {
        /* degrade silently — keep last known state */
      }
      if (!cancelled) {
        timer = setTimeout(poll, getPollIntervalMs());
      }
    }

    poll();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [place.id]);

  return (
    <LiveContext.Provider value={{ liveInPlace }}>
      {children}
    </LiveContext.Provider>
  );
}

export function useLive(): LiveContextValue {
  return useContext(LiveContext);
}
