import { SectionHeader } from "@/design-system/components/SectionHeader";
import { EmptyState } from "@/design-system/components/EmptyState";
import { DistrictCard } from "./DistrictCard";
import type { DistrictTimelineEvent } from "../types";

export type DistrictTimelineProps = {
  events: DistrictTimelineEvent[];
};

export function DistrictTimeline({ events }: DistrictTimelineProps) {
  return (
    <DistrictCard id="dv3-timeline" aria-labelledby="dv3-timeline-title">
      <SectionHeader title="District timeline" kicker="Today" />
      <h2 id="dv3-timeline-title" className="sr-only">
        District activity timeline
      </h2>

      {events.length === 0 ? (
        <EmptyState
          title="No timeline events"
          description="Chronological district updates will appear here."
          icon="🕐"
        />
      ) : (
        <ol className="dv3-timeline">
          {events.map((event) => (
            <li key={event.id} className="dv3-timeline__item">
              <p className="dv3-timeline__label">
                <time dateTime={event.timestamp}>{event.label}</time>
              </p>
              <p className="dv3-timeline__detail">{event.detail}</p>
            </li>
          ))}
        </ol>
      )}
      <p className="dv3-placeholder-note">Sample timeline until live activity feed ships.</p>
    </DistrictCard>
  );
}
