import type { StoryTimelineEvent } from "@/lib/news/story-markdown";

type StoryTimelineProps = {
  events: StoryTimelineEvent[];
};

export function StoryTimeline({ events }: StoryTimelineProps) {
  if (!events.length) return null;

  return (
    <section className="immersive-timeline" aria-labelledby="story-timeline-title">
      <h2 id="story-timeline-title" className="immersive-timeline__title">
        Key events
      </h2>
      <ol className="immersive-timeline__list">
        {events.map((event) => (
          <li key={event.id} className="immersive-timeline__item">
            <span className="immersive-timeline__marker" aria-hidden />
            <div>
              <p className="immersive-timeline__label">{event.label}</p>
              <p className="immersive-timeline__detail">{event.detail}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
