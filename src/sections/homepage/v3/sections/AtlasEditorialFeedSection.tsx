"use client";

import { useLanguage } from "@/providers/LanguageProvider";
import { pickBilingualLabel } from "@/lib/i18n/pick-label";
import type { HomeArticle } from "@/lib/homepage/types";
import type { RecommendedArticle } from "@/lib/personalization/types";
import { useEditorialFeed } from "../hooks/useEditorialFeed";
import { EditorialFeedItem } from "../components/feed/EditorialFeedItem";

type AtlasEditorialFeedSectionProps = {
  storyFeed: HomeArticle[];
  districtNews: HomeArticle[];
  liveUpdates: HomeArticle[];
  recommended: RecommendedArticle[];
  trendingFallback: HomeArticle[];
};

/**
 * Atlas Phase 2B — curated editorial feed with mixed story sizes.
 */
export function AtlasEditorialFeedSection({
  storyFeed,
  districtNews,
  liveUpdates,
  recommended,
  trendingFallback,
}: AtlasEditorialFeedSectionProps) {
  const { language } = useLanguage();
  const items = useEditorialFeed({
    storyFeed,
    districtNews,
    liveUpdates,
    recommended,
    trendingFallback,
  });

  const feedLabel = pickBilingualLabel(language, "Today's edition", "आज का संस्करण");
  const liveLabel = pickBilingualLabel(language, "LIVE", "लाइव");
  const updatesLabel = pickBilingualLabel(language, "updates", "अपडेट");

  if (!items.length) return null;

  const firstLeadIndex = items.findIndex((item) => item.layout === "lead");

  return (
    <section
      className="home-v31__section home-v31__enter atlas-feed-section"
      aria-labelledby="home-atlas-feed-title"
    >
      <h2 id="home-atlas-feed-title" className="atlas-feed-section__label">
        {feedLabel}
      </h2>

      <div className="atlas-feed" role="feed" aria-busy="false">
        {items.map((item, index) => (
          <EditorialFeedItem
            key={item.article.id}
            item={item}
            language={language}
            liveLabel={liveLabel}
            updatesLabel={updatesLabel}
            priorityImage={item.layout === "lead" && index === firstLeadIndex}
            showCompactDivider={index > 0}
          />
        ))}
      </div>
    </section>
  );
}
