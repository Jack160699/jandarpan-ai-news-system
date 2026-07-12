"use client";

import type { GeneratedHomepageFeed } from "@/lib/homepage/types";
import { PageContainer } from "@/layouts/PageContainer";
import { HomeSectionErrorBoundary } from "@/components/errors/HomeSectionErrorBoundary";
import { AdSlot } from "@/components/monetization/AdSlot";
import { useReaderAccount } from "@/providers/ReaderAccountProvider";
import { useReaderPreferences } from "@/providers/ReaderPreferencesProvider";
import { useEditorialIntelligenceOptional } from "@/providers/EditorialIntelligenceProvider";
import { getRecentReadSlugs } from "@/lib/reading-memory";
import { useHomepageLayout } from "@/hooks/useHomepageLayout";
import { useHomeV3Data } from "./hooks/useHomeV3Data";
import { LazyV3Section } from "./components/LazyV3Section";
import { LocalPulseSection } from "./sections/LocalPulseSection";
import { LeadStorySection } from "./sections/LeadStorySection";
import { QuickScanSection } from "./sections/QuickScanSection";
import { AtlasEditorialFeedSection } from "./sections/AtlasEditorialFeedSection";
import { ContinueReadingSection } from "./sections/ContinueReadingSection";
import { DiscoverStripSection } from "./sections/DiscoverStripSection";
import {
  FeedSkeleton,
  QuickScanSkeleton,
} from "./skeletons";
import "./styles/home-v31.css";
import "./styles/home-atlas-2a.css";
import "./styles/home-atlas-2b.css";

export type HomeExperienceV3Props = {
  feed: GeneratedHomepageFeed;
};

/**
 * JDP-031 — Jan Darpan V3.1 Homepage
 *
 * Local-first calm reading flow:
 * Local Pulse → Lead → Quick Scan → Feed → Near You → Live → Continue → For You → Discover
 */
export function HomeExperienceV3({ feed }: HomeExperienceV3Props) {
  const { interests } = useReaderAccount();
  const { prefs } = useReaderPreferences();
  const { layout } = useHomepageLayout();
  const editorial = useEditorialIntelligenceOptional();

  const data = useHomeV3Data(feed, {
    interestIds: interests,
    homeDistrict: prefs.homeDistrict ?? null,
    followedDistricts: layout.followedDistricts,
    bookmarkSlugs: editorial?.memory.bookmarks ?? [],
    recentReadSlugs: editorial ? getRecentReadSlugs(editorial.memory) : [],
  });

  return (
    <PageContainer width="homepage" className="home-v31">
      <div className="home-atlas-2a">
        <HomeSectionErrorBoundary name="v31-local-pulse">
          <LocalPulseSection
            districtName={data.districtName}
            districtNameHi={data.districtNameHi}
            localAlerts={data.localAlerts}
          />
        </HomeSectionErrorBoundary>

        <HomeSectionErrorBoundary name="v31-lead">
          <LeadStorySection story={data.leadStory} />
        </HomeSectionErrorBoundary>

        <HomeSectionErrorBoundary name="v31-quick-scan">
          <QuickScanSection stories={data.quickScan} />
        </HomeSectionErrorBoundary>
      </div>

      <HomeSectionErrorBoundary name="v31-ad-leaderboard">
        <AdSlot slotId="home_leaderboard" className="home-v31-ad" />
      </HomeSectionErrorBoundary>

      <div className="home-atlas-2b">
        <HomeSectionErrorBoundary name="v31-editorial-feed">
          <LazyV3Section
            id="home-atlas-feed"
            fallback={<FeedSkeleton />}
            minHeight="480px"
          >
            <AtlasEditorialFeedSection
              storyFeed={data.storyFeed}
              districtNews={data.districtNews}
              liveUpdates={data.liveUpdates}
              recommended={data.recommended}
              trendingFallback={data.trendingFallback}
            />
          </LazyV3Section>
        </HomeSectionErrorBoundary>

        <HomeSectionErrorBoundary name="v31-ad-mid">
          <AdSlot slotId="home_mid_feed" className="home-v31-ad" />
        </HomeSectionErrorBoundary>

        <HomeSectionErrorBoundary name="v31-continue">
          <ContinueReadingSection />
        </HomeSectionErrorBoundary>

        <HomeSectionErrorBoundary name="v31-discover">
          <LazyV3Section
            id="home-v31-discover"
            fallback={<QuickScanSkeleton />}
            minHeight="72px"
          >
            <DiscoverStripSection listenArticleIds={data.listenArticleIds} />
          </LazyV3Section>
        </HomeSectionErrorBoundary>
      </div>
    </PageContainer>
  );
}
