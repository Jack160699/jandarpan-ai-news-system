"use client";

import { useEffect, useMemo } from "react";
import { PersonalizedHomepageBody } from "@/components/personalization/PersonalizedHomepageBody";
import { HomepageStackBands } from "@/components/layout/HomepageStackBands";
import { NewUpdatesBanner } from "@/components/live-newsroom/NewUpdatesBanner";
import { HomeSectionErrorBoundary } from "@/components/errors/HomeSectionErrorBoundary";
import type { GeneratedHomepageFeed } from "@/lib/homepage/types";
import {
  hasValidHomeLead,
  homeDebug,
  normalizeHomepageFeed,
} from "@/lib/homepage/feed-safety";
import { isHomeV3Enabled } from "@/lib/homepage/config";
import { LiveNewsroomProvider } from "@/providers/LiveNewsroomProvider";
import { useLanguage } from "@/providers/LanguageProvider";
import { HomepageFooter } from "@/components/footer/HomepageFooter";
import { HomepageSeoHub } from "@/sections/homepage/HomepageSeoHub";
import { HomepageFeedFallback } from "@/sections/homepage/HomepageFeedFallback";
// Static import: this IS the default homepage body. Loading it via
// next/dynamic with a null fallback collapsed the page during hydration on
// slow networks — a 0.8+ CLS jump and ~19s LCP render delay on mobile.
import { HomeExperienceV3 } from "@/sections/homepage/v3/HomeExperienceV3";

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

  if (!normalizedServer || !hasValidHomeLead(normalizedServer)) {
    homeDebug("HomepageLiveView: empty feed");
    return <HomepageFeedFallback />;
  }

  const homeV3 = isHomeV3Enabled();

  return (
    <LiveNewsroomProvider
      initialFeed={normalizedServer}
      enabled={!contentLocked}
    >
      <div className="home-page">
        {!homeV3 ? (
          <HomeSectionErrorBoundary name="stack-bands">
            <HomepageStackBands
              trendingTopics={
                normalizedServer.footerIntelligence?.trendingSearches ?? []
              }
            />
          </HomeSectionErrorBoundary>
        ) : null}

        <NewUpdatesBanner />

        <div className="home-page__content pl-container">
          {homeV3 ? (
            <HomeExperienceV3 feed={normalizedServer} />
          ) : (
            <PersonalizedHomepageBody feed={normalizedServer} />
          )}
        </div>

        <HomeSectionErrorBoundary name="explore-topics">
          <HomepageSeoHub />
        </HomeSectionErrorBoundary>

        <HomepageFooter />
      </div>
    </LiveNewsroomProvider>
  );
}
