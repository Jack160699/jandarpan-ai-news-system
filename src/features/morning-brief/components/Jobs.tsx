import Link from "next/link";
import { Briefcase } from "lucide-react";
import { SectionHeader } from "@/design-system/components/SectionHeader";
import { BriefCard } from "./BriefCard";
import type { MorningBriefListItem } from "../types";

export type JobsProps = {
  items: MorningBriefListItem[];
};

export function Jobs({ items }: JobsProps) {
  return (
    <BriefCard id="mb-jobs" aria-labelledby="mb-jobs-title">
      <SectionHeader
        title="Jobs"
        kicker="Opportunities"
        actionLabel="View all"
        actionHref="/search?q=jobs"
      />
      <h2 id="mb-jobs-title" className="sr-only">
        Job listings
      </h2>
      <ul className="mb-list">
        {items.map((item) => (
          <li key={item.id} className="mb-list__item mb-list__item--stacked">
            <div className="mb-list__row">
              <Briefcase size={16} className="mb-list__icon" aria-hidden />
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
      <p className="mb-placeholder-note">Listings are sample placeholders until jobs feed ships.</p>
    </BriefCard>
  );
}
