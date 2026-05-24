"use client";

import { useEffect, useRef } from "react";
import { useAnalyticsCollector } from "@/hooks/useAnalyticsCollector";
import type { AnalyticsSurface } from "@/lib/analytics/types";

type ReaderAnalyticsTrackerProps = {
  slug: string;
  category: string;
  region?: string | null;
  surface?: AnalyticsSurface;
};

export function ReaderAnalyticsTracker({
  slug,
  category,
  region,
  surface = "story",
}: ReaderAnalyticsTrackerProps) {
  const { track } = useAnalyticsCollector();
  const startedAt = useRef(0);
  const maxScroll = useRef(0);
  const sentView = useRef(false);
  const sentMilestones = useRef(new Set<number>());

  useEffect(() => {
    startedAt.current = Date.now();
  }, []);

  useEffect(() => {
    if (sentView.current) return;
    sentView.current = true;
    track({
      eventType: "article_view",
      articleSlug: slug,
      category,
      region: region ?? undefined,
      surface,
    });
  }, [slug, category, region, surface, track]);

  useEffect(() => {
    const onScroll = () => {
      const doc = document.documentElement;
      const scrollTop = window.scrollY || doc.scrollTop;
      const height = doc.scrollHeight - window.innerHeight;
      if (height <= 0) return;
      const pct = Math.min(100, Math.round((scrollTop / height) * 100));
      if (pct <= maxScroll.current) return;
      maxScroll.current = pct;

      const milestones = [25, 50, 75, 90, 100];
      for (const m of milestones) {
        if (pct >= m && !sentMilestones.current.has(m)) {
          sentMilestones.current.add(m);
          track({
            eventType: "scroll_depth",
            articleSlug: slug,
            category,
            region: region ?? undefined,
            surface,
            valueNum: m,
          });
        }
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, [slug, category, region, surface, track]);

  useEffect(() => {
    const sendDwell = () => {
      const dwellMs = Date.now() - startedAt.current;
      track({
        eventType: "dwell",
        articleSlug: slug,
        category,
        region: region ?? undefined,
        surface,
        valueNum: dwellMs,
      });
    };

    const onHide = () => {
      if (document.visibilityState === "hidden") sendDwell();
    };

    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", sendDwell);

    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", sendDwell);
      sendDwell();
    };
  }, [slug, category, region, surface, track]);

  return null;
}
