import Link from "next/link";
import { Building2 } from "lucide-react";
import { SectionHeader } from "@/design-system/components/SectionHeader";
import { EmptyState } from "@/design-system/components/EmptyState";
import { DistrictCard } from "./DistrictCard";
import type { DistrictListItem } from "../types";

export type BusinessUpdatesProps = {
  items: DistrictListItem[];
};

export function BusinessUpdates({ items }: BusinessUpdatesProps) {
  return (
    <DistrictCard id="dv3-business" aria-labelledby="dv3-business-title">
      <SectionHeader
        title="Business updates"
        kicker="Economy"
        action={<Building2 size={18} className="dv3-section-icon" aria-hidden />}
      />
      <h2 id="dv3-business-title" className="sr-only">
        Business and economy updates
      </h2>

      {items.length === 0 ? (
        <EmptyState
          title="No business news"
          description="Local economy and business stories will appear here."
          icon="📈"
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
      <p className="dv3-placeholder-note">Sample business updates until economy feed ships.</p>
    </DistrictCard>
  );
}
