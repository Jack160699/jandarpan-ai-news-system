"use client";

import Link from "next/link";
import { SectionHeader } from "@/design-system/components/SectionHeader";
import { EmptyState } from "@/design-system/components/EmptyState";
import { formatHomeTime } from "@/lib/homepage/format";
import { useLanguage } from "@/providers/LanguageProvider";
import type { HomeArticle } from "@/lib/homepage/types";

type LiveUpdatesSectionProps = {
  updates: HomeArticle[];
};

export function LiveUpdatesSection({ updates }: LiveUpdatesSectionProps) {
  const { language } = useLanguage();

  return (
    <section
      className="home-v3__section home-v3__enter"
      aria-labelledby="home-v3-live-title"
    >
      <SectionHeader title="Live Updates" kicker="Now" />
      <h2 id="home-v3-live-title" className="sr-only">
        Live Updates
      </h2>

      {updates.length === 0 ? (
        <EmptyState
          title="No live updates"
          description="The newsroom is quiet right now. We'll surface breaking updates here."
          icon="◉"
        />
      ) : (
        <div className="home-v3-live-rail" role="list">
          {updates.map((item) => (
            <Link
              key={item.id}
              href={`/story/${item.slug}`}
              className="home-v3-live-card"
              role="listitem"
            >
              <div className="flex items-center gap-2">
                <span
                  className="home-v3-live-dot home-v3-live-dot--pulse"
                  aria-hidden
                />
                <span className="text-[var(--jds-text-meta)] text-[var(--jds-color-breaking)] uppercase tracking-wide">
                  {item.isLive ? "Live" : "Update"}
                </span>
                <span className="text-[var(--jds-text-meta)] text-[var(--jds-color-text-tertiary)] ml-auto">
                  {formatHomeTime(item.publishedAt, language)}
                </span>
              </div>
              <p className="font-medium text-[var(--jds-text-caption)] text-[var(--jds-color-text-primary)] line-clamp-3 m-0">
                {item.headline}
              </p>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
