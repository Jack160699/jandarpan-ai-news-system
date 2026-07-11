import { Car } from "lucide-react";
import { Badge } from "@/design-system/components/Badge";
import { SectionHeader } from "@/design-system/components/SectionHeader";
import { EmptyState } from "@/design-system/components/EmptyState";
import { DistrictCard } from "./DistrictCard";
import type { DistrictListItem } from "../types";

export type TrafficWidgetProps = {
  items: DistrictListItem[];
};

/**
 * Traffic widget — placeholder data until live traffic API connects.
 */
export function TrafficWidget({ items }: TrafficWidgetProps) {
  return (
    <DistrictCard id="dv3-traffic" aria-labelledby="dv3-traffic-title">
      <SectionHeader
        title="Traffic"
        kicker="Commute"
        action={
          <Badge variant="weather" className="dv3-widget-badge">
            Placeholder
          </Badge>
        }
      />
      <h2 id="dv3-traffic-title" className="sr-only">
        Traffic updates
      </h2>

      {items.length === 0 ? (
        <EmptyState
          title="No traffic alerts"
          description="Road and commute updates will appear here."
          icon="🚗"
        />
      ) : (
        <ul className="dv3-list">
          {items.map((item) => (
            <li key={item.id} className="dv3-list__item dv3-list__item--stacked">
              <div className="dv3-list__row">
                <Car size={16} className="dv3-list__icon" aria-hidden />
                <p className="dv3-list__title">{item.title}</p>
              </div>
              {item.meta ? <p className="dv3-list__meta">{item.meta}</p> : null}
            </li>
          ))}
        </ul>
      )}
      <p className="dv3-placeholder-note">Live traffic data coming soon.</p>
    </DistrictCard>
  );
}
