"use client";

import { useEffect, useState } from "react";
import type { PlatformArticle } from "@/lib/newsroom-platform/content/types";

export function useDistrictPlatformFeed(district: string, enabled = true) {
  const [items, setItems] = useState<PlatformArticle[]>([]);
  const [liveCount, setLiveCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!enabled || !district) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const res = await fetch(`/api/newsroom/districts/${district}`);
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
  }, [district, enabled]);

  return { items, liveCount, loading };
}
