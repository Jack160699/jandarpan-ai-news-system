"use client";

import { memo, useMemo, useRef } from "react";
import { LiveBadge } from "@/components/homepage/LiveBadge";
import { pickBilingualLabel } from "@/lib/i18n/pick-label";
import type { EventViewModel } from "@/lib/events/event-view-model";
import type { NewsroomLanguage } from "@/lib/i18n/languages";
import type { StoryTimelineEvent } from "@/lib/news/story-markdown";
import type { StoryIntelligenceVm } from "@/lib/story/story-intelligence";
import {
  buildThreadTimeline,
} from "../lib/build-thread-timeline";
import { useThreadVirtualList } from "../hooks/useThreadVirtualList";
import { AtlasThreadProgress } from "./AtlasThreadProgress";
import { AtlasThreadTimelineItem } from "./AtlasThreadTimelineItem";

type AtlasThreadTimelineProps = {
  language: NewsroomLanguage;
  eventViewModel?: EventViewModel | null;
  storyTimelineEvents?: StoryTimelineEvent[];
  liveHref?: string | null;
  currentSlug: string;
  currentHeadline: string;
  currentImage: string | null;
  currentPublishedAt: string | null;
  isArticleLive: boolean;
  intelligence: Pick<
    StoryIntelligenceVm,
    "trust" | "attribution" | "reader" | "knowledge" | "editorial"
  >;
};

export const AtlasThreadTimeline = memo(function AtlasThreadTimeline({
  language,
  eventViewModel,
  storyTimelineEvents = [],
  liveHref,
  currentSlug,
  currentHeadline,
  currentImage,
  currentPublishedAt,
  isArticleLive,
  intelligence,
}: AtlasThreadTimelineProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const vm = useMemo(
    () =>
      buildThreadTimeline({
        eventViewModel: eventViewModel ?? null,
        storyTimelineEvents,
        currentSlug,
        currentHeadline,
        currentImage,
        currentPublishedAt,
        liveHref: liveHref ?? null,
        isArticleLive,
        language,
        intelligence,
      }),
    [
      eventViewModel,
      storyTimelineEvents,
      currentSlug,
      currentHeadline,
      currentImage,
      currentPublishedAt,
      liveHref,
      isArticleLive,
      language,
      intelligence,
    ]
  );

  const { entries, hasThread, isLiveTimeline, currentIndex } = vm;

  const virtual = useThreadVirtualList(entries.length, containerRef);
  const visibleEntries = virtual.virtualized
    ? entries.slice(virtual.start, virtual.end)
    : entries;

  if (!hasThread) return null;

  const title = pickBilingualLabel(
    language,
    "Continue Following This Story",
    "इस कहानी को फॉलो करें"
  );
  const liveTimelineLabel = pickBilingualLabel(
    language,
    "Live Timeline",
    "लाइव टाइमलाइन"
  );
  const timelineLabel = pickBilingualLabel(
    language,
    "Story thread timeline",
    "कहानी थ्रेड टाइमलाइन"
  );

  return (
    <section
      className={`atlas-thread atlas-thread--enter${
        isLiveTimeline ? " atlas-thread--live" : ""
      }`}
      aria-labelledby="atlas-thread-title"
    >
      <header className="atlas-thread__header">
        <h2 id="atlas-thread-title" className="atlas-thread__title">
          {title}
        </h2>
        {isLiveTimeline ? (
          <span className="atlas-thread__live-label">
            <LiveBadge label={liveTimelineLabel} />
          </span>
        ) : null}
      </header>

      <AtlasThreadProgress
        entries={entries}
        currentIndex={currentIndex}
        language={language}
      />

      <div
        ref={virtual.virtualized ? containerRef : undefined}
        className={
          virtual.virtualized ? "atlas-thread__scroll" : "atlas-thread__list-wrap"
        }
        style={
          virtual.virtualized
            ? { maxHeight: "min(70vh, 960px)" }
            : undefined
        }
      >
        <ol
          className="atlas-thread__list"
          role="list"
          aria-label={timelineLabel}
          style={
            virtual.virtualized
              ? {
                  height: virtual.totalHeight,
                  paddingTop: virtual.offsetTop,
                }
              : undefined
          }
        >
          {visibleEntries.map((entry, index) => {
            const absoluteIndex = virtual.virtualized
              ? virtual.start + index
              : index;
            return (
              <AtlasThreadTimelineItem
                key={entry.id}
                entry={entry}
                language={language}
                isLast={absoluteIndex === entries.length - 1}
              />
            );
          })}
        </ol>
      </div>
    </section>
  );
});
