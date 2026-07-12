"use client";

import { Clock } from "lucide-react";
import { cn } from "@/design-system/utils/cn";
import type { AiTimelineEvent } from "../types";

export type TimelineCardProps = {
  events: AiTimelineEvent[];
  title?: string;
  className?: string;
};

/**
 * Chronological event list for developing stories.
 */
export function TimelineCard({ events, title = "Timeline", className }: TimelineCardProps) {
  if (events.length === 0) return null;

  return (
    <section
      className={cn("ai-v3-timeline", className)}
      aria-labelledby="ai-v3-timeline-heading"
    >
      <header className="ai-v3-timeline__header">
        <Clock size={14} aria-hidden />
        <h4 id="ai-v3-timeline-heading" className="ai-v3-timeline__title">
          {title}
        </h4>
      </header>
      <ol className="ai-v3-timeline__list">
        {events.map((event, i) => (
          <li key={event.id} className="ai-v3-timeline__item">
            <div className="ai-v3-timeline__marker" aria-hidden>
              <span className="ai-v3-timeline__dot" />
              {i < events.length - 1 && <span className="ai-v3-timeline__line" />}
            </div>
            <div className="ai-v3-timeline__content">
              <time className="ai-v3-timeline__time" dateTime={event.time}>
                {event.time}
              </time>
              <p className="ai-v3-timeline__event-title">{event.title}</p>
              {event.description && (
                <p className="ai-v3-timeline__desc">{event.description}</p>
              )}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
