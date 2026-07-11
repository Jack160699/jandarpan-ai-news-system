import { EmptyState, SectionHeader } from "@/design-system";
import type { StoryTimelineEvent } from "@/lib/news/story-markdown";

type TimelineProps = {
  events: StoryTimelineEvent[];
  title?: string;
};

export function Timeline({ events, title = "Timeline" }: TimelineProps) {
  if (!events.length) return null;

  return (
    <section
      className="article-v3-timeline article-v3__section"
      aria-labelledby="article-v3-timeline-title"
    >
      <SectionHeader title={title} />
      <ol className="article-v3-timeline__list">
        {events.map((event) => (
          <li key={event.id} className="article-v3-timeline__item">
            <p className="article-v3-timeline__label">{event.label}</p>
            <p className="article-v3-timeline__detail">{event.detail}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function TimelineEmpty({ title = "Timeline" }: { title?: string }) {
  return (
    <section className="article-v3__section" aria-labelledby="article-v3-timeline-empty">
      <SectionHeader title={title} />
      <EmptyState
        title="No timeline events"
        description="Chronological updates will appear here when available."
      />
    </section>
  );
}
