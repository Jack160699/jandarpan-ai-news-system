"use client";

import { useEffect, useState } from "react";
import type { BreakingTickerItem } from "@/lib/newsroom-platform/content/types";

export function useBreakingFeed(limit = 12) {
  const [items, setItems] = useState<BreakingTickerItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/newsroom/breaking?limit=${limit}`);
        if (!res.ok) return;
        const data = (await res.json()) as { items: BreakingTickerItem[] };
        if (!cancelled) setItems(data.items ?? []);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [limit]);

  return { items, loading };
}
