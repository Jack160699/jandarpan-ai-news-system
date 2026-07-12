import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { SectionHeader } from "@/design-system/components/SectionHeader";
import { BriefCard } from "./BriefCard";
import type { MorningBriefListItem } from "../types";

export type EventsProps = {
  items: MorningBriefListItem[];
};

export function Events({ items }: EventsProps) {
  return (
    <BriefCard id="mb-events" aria-labelledby="mb-events-title">
      <SectionHeader title="Events" kicker="Today near you" />
      <h2 id="mb-events-title" className="sr-only">
        Local events
      </h2>
      <ul className="mb-list">
        {items.map((item) => (
          <li key={item.id} className="mb-list__item mb-list__item--stacked">
            <div className="mb-list__row">
              <CalendarDays size={16} className="mb-list__icon" aria-hidden />
              {item.href ? (
                <Link href={item.href} className="mb-list__title mb-link">
                  {item.title}
                </Link>
              ) : (
                <p className="mb-list__title">{item.title}</p>
              )}
            </div>
            {item.meta ? <p className="mb-list__meta">{item.meta}</p> : null}
          </li>
        ))}
      </ul>
    </BriefCard>
  );
}
