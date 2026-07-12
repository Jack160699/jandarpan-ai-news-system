import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { SectionHeader } from "@/design-system/components/SectionHeader";
import { EmptyState } from "@/design-system/components/EmptyState";
import { DistrictCard } from "./DistrictCard";
import type { DistrictListItem } from "../types";

export type CrimeUpdatesProps = {
  items: DistrictListItem[];
};

export function CrimeUpdates({ items }: CrimeUpdatesProps) {
  return (
    <DistrictCard id="dv3-crime" aria-labelledby="dv3-crime-title">
      <SectionHeader
        title="Crime updates"
        kicker="Law & order"
        action={<ShieldAlert size={18} className="dv3-section-icon" aria-hidden />}
      />
      <h2 id="dv3-crime-title" className="sr-only">
        Crime and safety updates
      </h2>

      {items.length === 0 ? (
        <EmptyState
          title="No crime updates"
          description="Safety and law enforcement news will appear here."
          icon="🛡️"
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
      <p className="dv3-placeholder-note">Sample safety updates until crime feed ships.</p>
    </DistrictCard>
  );
}
