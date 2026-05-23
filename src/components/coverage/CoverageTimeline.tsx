import type { CoverageTimelineEntry } from "@/lib/news/coverage/timeline";

type CoverageTimelineProps = {
  events: CoverageTimelineEntry[];
};

export function CoverageTimeline({ events }: CoverageTimelineProps) {
  if (!events.length) return null;

  return (
    <section
      className="coverage-timeline"
      aria-labelledby="coverage-timeline-title"
    >
      <h2 id="coverage-timeline-title" className="coverage-timeline__title">
        Event timeline
      </h2>
      <ol className="coverage-timeline__list">
        {events.map((event) => (
          <li
            key={event.id}
            className={`coverage-timeline__item coverage-timeline__item--${event.type}`}
          >
            <span className="coverage-timeline__marker" aria-hidden />
            <div>
              <p className="coverage-timeline__label">
                {event.label}
                {event.isBreaking ? (
                  <span className="coverage-timeline__breaking"> · Breaking</span>
                ) : null}
              </p>
              <p className="coverage-timeline__detail">{event.detail}</p>
              {event.sourceLine ? (
                <p className="coverage-timeline__source">{event.sourceLine}</p>
              ) : null}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
