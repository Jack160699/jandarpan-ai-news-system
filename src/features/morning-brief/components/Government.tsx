import Link from "next/link";
import { Landmark } from "lucide-react";
import { SectionHeader } from "@/design-system/components/SectionHeader";
import { BriefCard } from "./BriefCard";
import type { MorningBriefListItem } from "../types";

export type GovernmentProps = {
  items: MorningBriefListItem[];
};

export function Government({ items }: GovernmentProps) {
  return (
    <BriefCard id="mb-government" aria-labelledby="mb-government-title">
      <SectionHeader
        title="Government"
        kicker="Official updates"
        action={
          <Landmark size={18} className="mb-section-icon" aria-hidden />
        }
      />
      <h2 id="mb-government-title" className="sr-only">
        Government announcements
      </h2>
      <ul className="mb-list">
        {items.map((item) => (
          <li key={item.id} className="mb-list__item mb-list__item--stacked">
            {item.href ? (
              <Link href={item.href} className="mb-list__title mb-link">
                {item.title}
              </Link>
            ) : (
              <p className="mb-list__title">{item.title}</p>
            )}
            {item.summary ? <p className="mb-list__summary">{item.summary}</p> : null}
            {item.meta ? <p className="mb-list__meta">{item.meta}</p> : null}
          </li>
        ))}
      </ul>
    </BriefCard>
  );
}
