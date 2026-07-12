import Link from "next/link";
import { Briefcase } from "lucide-react";
import { SectionHeader } from "@/design-system/components/SectionHeader";
import { EmptyState } from "@/design-system/components/EmptyState";
import { DistrictCard } from "./DistrictCard";
import type { DistrictListItem } from "../types";

export type JobsWidgetProps = {
  items: DistrictListItem[];
};

export function JobsWidget({ items }: JobsWidgetProps) {
  return (
    <DistrictCard id="dv3-jobs" aria-labelledby="dv3-jobs-title">
      <SectionHeader
        title="Jobs"
        kicker="Opportunities"
        actionLabel="Search jobs"
        actionHref="/search?q=jobs"
      />
      <h2 id="dv3-jobs-title" className="sr-only">
        Job listings
      </h2>

      {items.length === 0 ? (
        <EmptyState
          title="No job listings"
          description="Local vacancies will appear here when the jobs feed is connected."
          icon="💼"
        />
      ) : (
        <ul className="dv3-list">
          {items.map((item) => (
            <li key={item.id} className="dv3-list__item dv3-list__item--stacked">
              <div className="dv3-list__row">
                <Briefcase size={16} className="dv3-list__icon" aria-hidden />
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
      <p className="dv3-placeholder-note">Sample listings until jobs feed ships.</p>
    </DistrictCard>
  );
}
