"use client";

import Link from "next/link";
import { formatHomeTime } from "@/lib/homepage/format";
import { useLanguage } from "@/providers/LanguageProvider";
import type { LiveV3TimelineEntry } from "../types";
import { LiveBadge } from "./LiveBadge";

export type TimelineProps = {
  entries: LiveV3TimelineEntry[];
  freshIds?: ReadonlySet<string>;
};

export function Timeline({ entries, freshIds }: TimelineProps) {
  const { language } = useLanguage();

  if (entries.length === 0) return null;

  return (
    <ol className="lv3-timeline" aria-label="Live updates timeline">
      {entries.map((entry, index) => {
        const isFresh = freshIds?.has(entry.id) ?? false;
        const isLast = index === entries.length - 1;
        return (
          <li
            key={entry.id}
            className={`lv3-timeline__item${isFresh ? " lv3-timeline__item--fresh" : ""}`}
          >
            <div className="lv3-timeline__rail" aria-hidden>
              <span className="lv3-timeline__node" />
              {!isLast ? <span className="lv3-timeline__line" /> : null}
            </div>
            <div className="lv3-timeline__content">
              <div className="lv3-timeline__meta">
                <time dateTime={entry.timestamp}>
                  {formatHomeTime(entry.timestamp, language)}
                </time>
                {entry.isBreaking ? (
                  <LiveBadge label="Breaking" variant="breaking" pulse={false} />
                ) : entry.isLive ? (
                  <LiveBadge variant="compact" />
                ) : null}
              </div>
              <Link href={`/story/${entry.slug}`} className="lv3-timeline__link">
                {entry.headline}
              </Link>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
