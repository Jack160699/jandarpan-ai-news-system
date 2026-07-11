"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo } from "react";
import { HomepageStackBands } from "@/components/layout/HomepageStackBands";
import { NewUpdatesBanner } from "@/components/live-newsroom/NewUpdatesBanner";
import { HomeSectionErrorBoundary } from "@/components/errors/HomeSectionErrorBoundary";
import type { GeneratedHomepageFeed } from "@/lib/homepage/types";
import {
  hasValidHomeLead,
  homeDebug,
  normalizeHomepageFeed,
} from "@/lib/homepage/feed-safety";
import { LiveNewsroomProvider } from "@/providers/LiveNewsroomProvider";
import { useLanguage } from "@/providers/LanguageProvider";
import { HomepageFooter } from "@/components/footer/HomepageFooter";
import { HomepageSeoHub } from "@/sections/homepage/HomepageSeoHub";
import { HomepageFeedFallback } from "@/sections/homepage/HomepageFeedFallback";

const PersonalizedHomepageBody = dynamic(
  () =>
    import("@/components/personalization/PersonalizedHomepageBody").then(
      (m) => ({ default: m.PersonalizedHomepageBody })
    ),
  { ssr: false, loading: () => null }
);

type HomepageLiveViewProps = {
  feed: GeneratedHomepageFeed;
};

export function HomepageLiveView({ feed: serverFeed }: HomepageLiveViewProps) {
  const { contentLocked, language } = useLanguage();

  const normalizedServer = useMemo(
    () => normalizeHomepageFeed(serverFeed),
    [serverFeed]
  );

  useEffect(() => {
    homeDebug("HomepageLiveView", {
      language,
      contentLocked,
      hasLead: hasValidHomeLead(normalizedServer),
    });
  }, [language, contentLocked, normalizedServer]);

  if (contentLocked) {
    return null;
  }

  if (!normalizedServer || !hasValidHomeLead(normalizedServer)) {
    homeDebug("HomepageLiveView: empty feed");
    return <HomepageFeedFallback />;
  }

  return (
    <LiveNewsroomProvider initialFeed={normalizedServer}>
      <div className="home-page">
        <HomeSectionErrorBoundary name="stack-bands">
          <HomepageStackBands
            trendingTopics={
              normalizedServer.footerIntelligence?.trendingSearches ?? []
            }
          />
        </HomeSectionErrorBoundary>

        <NewUpdatesBanner />

        <div className="home-page__content pl-container">
          <PersonalizedHomepageBody feed={normalizedServer} />
        </div>

        <HomeSectionErrorBoundary name="explore-topics">
          <HomepageSeoHub />
        </HomeSectionErrorBoundary>

        <HomepageFooter />
      </div>
    </LiveNewsroomProvider>
  );
}
