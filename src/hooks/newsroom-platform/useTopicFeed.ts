"use client";

import { useEffect, useState } from "react";
import type { PlatformArticle } from "@/lib/newsroom-platform/content/types";

export function useTopicFeed(slug: string) {
  const [items, setItems] = useState<PlatformArticle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/newsroom/topics/${slug}`);
        if (!res.ok) return;
        const data = (await res.json()) as { items: PlatformArticle[] };
        if (!cancelled) setItems(data.items ?? []);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  return { items, loading };
}
