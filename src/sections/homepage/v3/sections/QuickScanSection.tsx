"use client";

import Link from "next/link";
import { SectionHeader } from "@/design-system/components/SectionHeader";
import { formatHomeTime } from "@/lib/homepage/format";
import { useLanguage } from "@/providers/LanguageProvider";
import { pickBilingualLabel } from "@/lib/i18n/pick-label";
import type { HomeArticle } from "@/lib/homepage/types";

type QuickScanSectionProps = {
  stories: HomeArticle[];
};

export function QuickScanSection({ stories }: QuickScanSectionProps) {
  const { language } = useLanguage();

  if (stories.length < 2) return null;

  return (
    <section
      className="home-v31__section home-v31__enter"
      aria-labelledby="home-v31-scan-title"
    >
      <SectionHeader
        title={pickBilingualLabel(language, "Quick Scan", "तेज़ पढ़ें")}
        kicker={pickBilingualLabel(language, "Headlines", "शीर्षक")}
      />
      <h2 id="home-v31-scan-title" className="sr-only">
        Quick Scan
      </h2>

      <div className="home-v31-scan-rail" role="list">
        {stories.map((story) => (
          <Link
            key={story.id}
            href={`/story/${story.slug}`}
            className="home-v31-scan-card tap-target"
            role="listitem"
          >
            {story.categoryLabel ? (
              <span className="home-v31-scan-card__category">
                {story.categoryLabel}
              </span>
            ) : null}
            <span className="home-v31-scan-card__headline">{story.headline}</span>
            <span className="home-v31-scan-card__meta">
              {formatHomeTime(story.publishedAt, language)}
              {story.readingTime ? ` · ${story.readingTime}` : ""}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
