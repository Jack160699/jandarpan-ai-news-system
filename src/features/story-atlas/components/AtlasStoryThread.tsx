"use client";

import { memo } from "react";
import Link from "next/link";
import { formatRelativeTime } from "@/lib/i18n/format";
import { pickBilingualLabel } from "@/lib/i18n/pick-label";
import type { EventViewModel } from "@/lib/events/event-view-model";
import type { NewsroomLanguage } from "@/lib/i18n/languages";
import type { StoryTimelineEvent } from "@/lib/news/story-markdown";
import { AtlasFactBox } from "./AtlasFactBox";

type AtlasStoryThreadProps = {
  language: NewsroomLanguage;
  eventViewModel?: EventViewModel | null;
  timelineEvents?: StoryTimelineEvent[];
  liveHref?: string | null;
};

export const AtlasStoryThread = memo(function AtlasStoryThread({
  language,
  eventViewModel,
  timelineEvents = [],
  liveHref,
}: AtlasStoryThreadProps) {
  const title = pickBilingualLabel(
    language,
    "Continue Following This Story",
    "इस कहानी को फॉलो करें"
  );

  const updates = eventViewModel?.recent_updates
    ?.slice()
    .sort(
      (a, b) =>
        new Date(a.published_at).getTime() - new Date(b.published_at).getTime()
    ) ?? [];

  const hasUpdates = updates.length > 0;
  const hasTimeline = timelineEvents.length > 0;

  if (!hasUpdates && !hasTimeline) return null;

  return (
    <section className="atlas-story-thread" aria-labelledby="atlas-story-thread-title">
      <h2 id="atlas-story-thread-title" className="atlas-story-thread__title">
        {title}
      </h2>

      <AtlasFactBox title={title} variant="timeline">
        <ol className="atlas-story-thread__list">
          {hasUpdates
            ? updates.map((update) => (
                <li key={update.id} className="atlas-story-thread__item">
                  {liveHref ? (
                    <Link href={liveHref} className="atlas-story-thread__link">
                      <span className="atlas-story-thread__headline">
                        {update.headline}
                      </span>
                      <time
                        className="atlas-story-thread__time"
                        dateTime={update.published_at}
                      >
                        {formatRelativeTime(update.published_at, language)}
                      </time>
                    </Link>
                  ) : (
                    <>
                      <p className="atlas-story-thread__headline">
                        {update.headline}
                      </p>
                      <time
                        className="atlas-story-thread__time"
                        dateTime={update.published_at}
                      >
                        {formatRelativeTime(update.published_at, language)}
                      </time>
                    </>
                  )}
                </li>
              ))
            : timelineEvents.map((event) => (
                <li key={event.id} className="atlas-story-thread__item">
                  <p className="atlas-story-thread__headline">{event.label}</p>
                  <p className="atlas-story-thread__detail">{event.detail}</p>
                </li>
              ))}
        </ol>
      </AtlasFactBox>
    </section>
  );
});
