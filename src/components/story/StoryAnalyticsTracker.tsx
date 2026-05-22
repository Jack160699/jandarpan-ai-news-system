"use client";

import { useEffect, useRef } from "react";

type StoryAnalyticsTrackerProps = {
  slug: string;
  source: string | null;
  category: string;
  provider: string | null;
};

export function StoryAnalyticsTracker({
  slug,
  source,
  category,
  provider,
}: StoryAnalyticsTrackerProps) {
  const startedAt = useRef(Date.now());
  const sentView = useRef(false);

  useEffect(() => {
    if (sentView.current) return;
    sentView.current = true;

    void fetch("/api/story/analytics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event: "view",
        slug,
        source,
        category,
        provider,
      }),
      keepalive: true,
    }).catch(() => {});
  }, [slug, source, category, provider]);

  useEffect(() => {
    const sendDwell = () => {
      const dwellMs = Date.now() - startedAt.current;
      void fetch("/api/story/analytics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event: "dwell",
          slug,
          dwellMs,
          source,
          category,
        }),
        keepalive: true,
      }).catch(() => {});
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
  }, [slug, source, category]);

  return null;
}
