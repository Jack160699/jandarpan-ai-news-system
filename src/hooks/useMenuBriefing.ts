"use client";

import { useEffect, useState } from "react";
import { fetchLiveSnapshotShared } from "@/lib/realtime/live-poll-coordinator";

export type MenuBriefing = {
  breakingHeadline: string | null;
  localAlert: string | null;
};

const FALLBACK: MenuBriefing = {
  breakingHeadline: null,
  localAlert: null,
};

/**
 * Lightweight briefing when menu opens — reuses shared live snapshot cache.
 */
export function useMenuBriefing(
  menuOpen: boolean,
  live?: MenuBriefing | null
): MenuBriefing {
  const [remote, setRemote] = useState<MenuBriefing>(FALLBACK);

  useEffect(() => {
    if (!menuOpen) return;
    if (live?.breakingHeadline) return;

    let cancelled = false;
    const ac = new AbortController();

    (async () => {
      try {
        const result = await fetchLiveSnapshotShared({ signal: ac.signal });
        if (!result.ok || !result.snapshot || cancelled) return;

        const breaking =
          result.snapshot.breakingTicker?.[0]?.headline?.trim() ?? null;
        const alert = result.snapshot.localBreakingAlerts?.[0];
        const localAlert = alert
          ? alert.district
            ? `${alert.district}: ${alert.headline}`
            : alert.headline ?? null
          : null;
        setRemote({ breakingHeadline: breaking, localAlert });
      } catch {
        /* ignore */
      }
    })();

    return () => {
      cancelled = true;
      ac.abort();
    };
  }, [menuOpen, live?.breakingHeadline]);

  if (live?.breakingHeadline || live?.localAlert) {
    return {
      breakingHeadline: live.breakingHeadline ?? remote.breakingHeadline,
      localAlert: live.localAlert ?? remote.localAlert,
    };
  }

  return remote;
}
