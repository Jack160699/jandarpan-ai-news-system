"use client";

import { useEffect, useState } from "react";

export type MenuBriefing = {
  breakingHeadline: string | null;
  localAlert: string | null;
};

const FALLBACK: MenuBriefing = {
  breakingHeadline: null,
  localAlert: null,
};

/**
 * Lightweight briefing when menu opens — uses live API only if needed.
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
        const res = await fetch("/api/homepage/live", {
          signal: ac.signal,
          cache: "no-store",
        });
        if (!res.ok || cancelled) return;
        const json = (await res.json()) as {
          ok?: boolean;
          snapshot?: {
            breakingTicker?: { headline?: string }[];
            localBreakingAlerts?: {
              headline?: string;
              district?: string;
            }[];
          };
        };
        if (!json.ok || !json.snapshot || cancelled) return;
        const breaking =
          json.snapshot.breakingTicker?.[0]?.headline?.trim() ?? null;
        const alert = json.snapshot.localBreakingAlerts?.[0];
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
