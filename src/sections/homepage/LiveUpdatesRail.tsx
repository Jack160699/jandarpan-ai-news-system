"use client";

import Link from "next/link";
import { LiveBadge } from "@/components/homepage/LiveBadge";
import { UrgencyIndicator } from "@/components/homepage/UrgencyIndicator";
import type { HomeArticle } from "@/lib/homepage/types";

type LiveUpdatesRailProps = {
  updates: HomeArticle[];
};

export function LiveUpdatesRail({ updates }: LiveUpdatesRailProps) {
  if (!updates.length) return null;

  return (
    <section className="hp__section" aria-labelledby="hp-live-title">
      <div className="hp__inner">
        <div className="hp__title-row">
          <div>
            <p className="hp__kicker">Wire</p>
            <h2 id="hp-live-title" className="hp__title">
              Live updates
            </h2>
          </div>
          <span className="hp__title-hi">लाइव अपडेट</span>
        </div>
      </div>
      <div
        className="hp-rail"
        role="list"
        aria-label="Live updates — swipe to browse"
      >
        {updates.map((item) => (
          <Link
            key={item.id}
            href={`/story/${item.slug}`}
            className="hp-rail__card"
            role="listitem"
          >
            <div className="hp-rail__meta">
              {item.isLive ? <LiveBadge /> : null}
              <UrgencyIndicator level={item.urgency} />
              <span>{item.section}</span>
            </div>
            <p className="hp-rail__headline">{item.headline}</p>
            <span className="hp-rail__meta">
              <span>{item.readingTime}</span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
