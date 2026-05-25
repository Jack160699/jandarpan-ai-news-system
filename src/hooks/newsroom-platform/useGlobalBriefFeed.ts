"use client";

import { useEffect, useState } from "react";
import type {
  GlobalBriefSegment,
  PlatformArticle,
} from "@/lib/newsroom-platform/content/types";

export function useGlobalBriefFeed(segment: GlobalBriefSegment, enabled = true) {
  const [items, setItems] = useState<PlatformArticle[]>([]);
  const [liveCount, setLiveCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const res = await fetch(
          `/api/newsroom/global-brief?segment=${segment}`
        );
        if (!res.ok) return;
        const data = (await res.json()) as {
          items: PlatformArticle[];
          liveCount: number;
        };
        if (!cancelled) {
          setItems(data.items ?? []);
          setLiveCount(data.liveCount ?? 0);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [segment, enabled]);

  return { items, liveCount, loading };
}
