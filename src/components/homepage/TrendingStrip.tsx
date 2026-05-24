"use client";

import { useState } from "react";
import { DEFAULT_TRENDING_TOPICS } from "@/lib/navigation";
import { useLanguage } from "@/providers/LanguageProvider";

type TrendingStripProps = {
  topics?: string[];
};

export function TrendingStrip({ topics }: TrendingStripProps) {
  const { t } = useLanguage();
  const [paused, setPaused] = useState(false);
  const items = topics?.length ? topics : [...DEFAULT_TRENDING_TOPICS];
  const doubled = [...items, ...items];

  return (
    <section
      className={`trending-strip${paused ? " trending-strip--paused" : ""}`}
      aria-label="Trending topics"
      onPointerDown={() => setPaused(true)}
      onPointerUp={() => setPaused(false)}
      onPointerLeave={() => setPaused(false)}
      onPointerCancel={() => setPaused(false)}
    >
      <span className="trending-strip__label" aria-hidden>
        {t.nav.trendingShort}
      </span>
      <div className="trending-strip__viewport">
        <div className="trending-strip__track">
          {doubled.map((topic, i) => (
            <span
              key={`${topic}-${i}`}
              className="trending-strip__pill"
              aria-hidden={i >= items.length ? true : undefined}
            >
              {topic}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
