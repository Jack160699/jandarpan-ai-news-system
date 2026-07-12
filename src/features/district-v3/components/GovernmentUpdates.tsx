import Link from "next/link";
import { Landmark } from "lucide-react";
import { SectionHeader } from "@/design-system/components/SectionHeader";
import { EmptyState } from "@/design-system/components/EmptyState";
import { DistrictCard } from "./DistrictCard";
import type { DistrictListItem } from "../types";

export type GovernmentUpdatesProps = {
  items: DistrictListItem[];
};

export function GovernmentUpdates({ items }: GovernmentUpdatesProps) {
  return (
    <DistrictCard id="dv3-government" aria-labelledby="dv3-government-title">
      <SectionHeader
        title="Government updates"
        kicker="Official"
        action={<Landmark size={18} className="dv3-section-icon" aria-hidden />}
      />
      <h2 id="dv3-government-title" className="sr-only">
        Government announcements
      </h2>

      {items.length === 0 ? (
        <EmptyState
          title="No government updates"
          description="Official announcements for your district will appear here."
          icon="🏛️"
        />
      ) : (
        <ul className="dv3-list">
          {items.map((item) => (
            <li key={item.id} className="dv3-list__item dv3-list__item--stacked">
              {item.href ? (
                <Link href={item.href} className="dv3-list__title dv3-link">
                  {item.title}
                </Link>
              ) : (
                <p className="dv3-list__title">{item.title}</p>
              )}
              {item.summary ? <p className="dv3-list__summary">{item.summary}</p> : null}
              {item.meta ? <p className="dv3-list__meta">{item.meta}</p> : null}
            </li>
          ))}
        </ul>
      )}
      <p className="dv3-placeholder-note">Sample civic updates until government feed ships.</p>
    </DistrictCard>
  );
}
