import { Car } from "lucide-react";
import { SectionHeader } from "@/design-system/components/SectionHeader";
import { BriefCard } from "./BriefCard";
import type { MorningBriefListItem } from "../types";

export type TrafficProps = {
  items: MorningBriefListItem[];
};

export function Traffic({ items }: TrafficProps) {
  return (
    <BriefCard id="mb-traffic" aria-labelledby="mb-traffic-title">
      <SectionHeader title="Traffic" kicker="Commute" />
      <h2 id="mb-traffic-title" className="sr-only">
        Traffic updates
      </h2>
      <ul className="mb-list">
        {items.map((item) => (
          <li key={item.id} className="mb-list__item mb-list__item--stacked">
            <div className="mb-list__row">
              <Car size={16} className="mb-list__icon" aria-hidden />
              <p className="mb-list__title">{item.title}</p>
            </div>
            {item.meta ? <p className="mb-list__meta">{item.meta}</p> : null}
          </li>
        ))}
      </ul>
    </BriefCard>
  );
}
