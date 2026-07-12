"use client";

import { memo } from "react";
import Link from "next/link";
import { JdsCardImage } from "@/design-system/components/JdsCardImage/JdsCardImage";
import { IMG_CARD_COMPACT } from "@/design-system/components/editorial/image-sizes";
import { pickBilingualLabel } from "@/lib/i18n/pick-label";
import type { NewsroomLanguage } from "@/lib/i18n/languages";
import type { ThreadTimelineEntry } from "../lib/build-thread-timeline";
import { AtlasThreadTrustRow } from "./AtlasThreadTrustRow";

type AtlasThreadTimelineItemProps = {
  entry: ThreadTimelineEntry;
  language: NewsroomLanguage;
  isLast: boolean;
};

export const AtlasThreadTimelineItem = memo(function AtlasThreadTimelineItem({
  entry,
  language,
  isLast,
}: AtlasThreadTimelineItemProps) {
  const currentLabel = pickBilingualLabel(
    language,
    "You are reading this update",
    "आप यह अपडेट पढ़ रहे हैं"
  );

  const content = (
    <>
      <div className="atlas-thread-item__rail" aria-hidden>
        <span className="atlas-thread-item__node" />
        {!isLast ? <span className="atlas-thread-item__stem" /> : null}
      </div>

      <div className="atlas-thread-item__body">
        {entry.timestamp ? (
          <time
            className="atlas-thread-item__time"
            dateTime={entry.timestamp}
          >
            {entry.trust.timeLabel}
          </time>
        ) : entry.trust.timeLabel ? (
          <span className="atlas-thread-item__time">{entry.trust.timeLabel}</span>
        ) : null}

        <p className="atlas-thread-item__headline">{entry.headline}</p>

        <AtlasThreadTrustRow
          trust={entry.trust}
          language={language}
          showTime={false}
        />

        {entry.isCurrent ? (
          <span className="atlas-thread-item__current-badge">{currentLabel}</span>
        ) : null}

        {entry.thumbnail ? (
          <div className="atlas-thread-item__thumb">
            <JdsCardImage
              src={entry.thumbnail}
              alt=""
              category="news"
              cropAspect="16:9"
              sizes={IMG_CARD_COMPACT}
              className="atlas-thread-item__image"
            />
          </div>
        ) : null}
      </div>
    </>
  );

  const className = [
    "atlas-thread-item",
    entry.isCurrent ? "atlas-thread-item--current" : "",
    entry.isLive ? "atlas-thread-item--live" : "",
  ]
    .filter(Boolean)
    .join(" ");

  if (entry.href) {
    return (
      <li
        className={className}
        role="listitem"
        aria-current={entry.isCurrent ? "true" : undefined}
      >
        <Link href={entry.href} className="atlas-thread-item__link tap-target">
          {content}
        </Link>
      </li>
    );
  }

  return (
    <li
      className={className}
      role="listitem"
      aria-current={entry.isCurrent ? "true" : undefined}
    >
      <div className="atlas-thread-item__static">{content}</div>
    </li>
  );
});
