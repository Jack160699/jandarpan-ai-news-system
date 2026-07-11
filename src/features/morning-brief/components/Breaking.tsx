import Link from "next/link";
import { Zap } from "lucide-react";
import { Badge } from "@/design-system/components/Badge";
import { SectionHeader } from "@/design-system/components/SectionHeader";
import { BriefCard } from "./BriefCard";
import type { MorningBriefBreakingItem } from "../types";

export type BreakingProps = {
  items: MorningBriefBreakingItem[];
};

export function Breaking({ items }: BreakingProps) {
  return (
    <BriefCard id="mb-breaking" tone="accent" aria-labelledby="mb-breaking-title">
      <SectionHeader
        title="Breaking"
        kicker="Right now"
        action={
          <Badge variant="breaking">
            <Zap size={12} aria-hidden />
            {items.length} active
          </Badge>
        }
      />
      <h2 id="mb-breaking-title" className="sr-only">
        Breaking news
      </h2>
      <ol className="mb-list mb-list--breaking">
        {items.map((item, index) => (
          <li key={item.id} className="mb-list__item">
            <span className="mb-list__rank" aria-hidden>
              {String(index + 1).padStart(2, "0")}
            </span>
            <div className="mb-list__body">
              {item.slug ? (
                <Link href={`/story/${item.slug}`} className="mb-list__title mb-link">
                  {item.headline}
                </Link>
              ) : (
                <p className="mb-list__title">{item.headline}</p>
              )}
              <p className="mb-list__meta">
                {item.category ? <span>{item.category}</span> : null}
                {item.category && item.publishedAt ? <span aria-hidden> · </span> : null}
                {item.publishedAt ? <time>{item.publishedAt}</time> : null}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </BriefCard>
  );
}
