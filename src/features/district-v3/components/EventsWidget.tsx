import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { SectionHeader } from "@/design-system/components/SectionHeader";
import { EmptyState } from "@/design-system/components/EmptyState";
import { DistrictCard } from "./DistrictCard";
import type { DistrictListItem } from "../types";

export type EventsWidgetProps = {
  items: DistrictListItem[];
};

export function EventsWidget({ items }: EventsWidgetProps) {
  return (
    <DistrictCard id="dv3-events" aria-labelledby="dv3-events-title">
      <SectionHeader title="Events" kicker="Near you" />
      <h2 id="dv3-events-title" className="sr-only">
        Local events
      </h2>

      {items.length === 0 ? (
        <EmptyState
          title="No events scheduled"
          description="Community events in your district will show up here."
          icon="📅"
        />
      ) : (
        <ul className="dv3-list">
          {items.map((item) => (
            <li key={item.id} className="dv3-list__item dv3-list__item--stacked">
              <div className="dv3-list__row">
                <CalendarDays size={16} className="dv3-list__icon" aria-hidden />
                {item.href ? (
                  <Link href={item.href} className="dv3-list__title dv3-link">
                    {item.title}
                  </Link>
                ) : (
                  <p className="dv3-list__title">{item.title}</p>
                )}
              </div>
              {item.meta ? <p className="dv3-list__meta">{item.meta}</p> : null}
            </li>
          ))}
        </ul>
      )}
      <p className="dv3-placeholder-note">Sample events until events feed ships.</p>
    </DistrictCard>
  );
}
