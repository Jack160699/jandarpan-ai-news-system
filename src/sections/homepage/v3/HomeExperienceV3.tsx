"use client";

import type { GeneratedHomepageFeed } from "@/lib/homepage/types";
import { PageContainer } from "@/layouts/PageContainer";
import { HomeSectionErrorBoundary } from "@/components/errors/HomeSectionErrorBoundary";
import { AdSlot } from "@/components/monetization/AdSlot";
import { useReaderAccount } from "@/providers/ReaderAccountProvider";
import { useReaderPreferences } from "@/providers/ReaderPreferencesProvider";
import { useEditorialIntelligenceOptional } from "@/providers/EditorialIntelligenceProvider";
import { getRecentReadSlugs } from "@/lib/reading-memory";
import { pickBilingualLabel } from "@/lib/i18n/pick-label";
import { useLanguage } from "@/providers/LanguageProvider";
import { useHomepageLayout } from "@/hooks/useHomepageLayout";
import { useHomeV3Data } from "./hooks/useHomeV3Data";
import { LazyV3Section } from "./components/LazyV3Section";
import { LocalPulseSection } from "./sections/LocalPulseSection";
import { LeadStorySection } from "./sections/LeadStorySection";
import { QuickScanSection } from "./sections/QuickScanSection";
import { AtlasEditorialFeedSection } from "./sections/AtlasEditorialFeedSection";
import { ContinueReadingSection } from "./sections/ContinueReadingSection";
import { DiscoverStripSection } from "./sections/DiscoverStripSection";
import { DeepDiveSections } from "./sections/DeepDiveSections";
import { TopTenAudioSection } from "./sections/TopTenAudioSection";
import {
  FeedSkeleton,
  QuickScanSkeleton,
} from "./skeletons";
import "./styles/home-v31.css";
import "./styles/home-atlas-2a.css";
import "./styles/home-atlas-2b.css";
import "./styles/home-atlas-2c.css";
import "./styles/home-newsroom-refresh.css";

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
  const { language } = useLanguage();
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

  const districtLabel = pickBilingualLabel(
    language,
    data.districtName,
    data.districtNameHi
  );

  return (
    <PageContainer width="homepage" className="home-v31">
      <HomeSectionErrorBoundary name="v31-ad-leaderboard">
        <AdSlot
          slotId="home_leaderboard"
          format="mobile-banner"
          responsiveSizes="(max-width: 767px) 320x50, 728x90"
          minReservedHeight={50}
          collapseIfEmpty
          className="home-v31-ad home-v31-ad--top"
        />
      </HomeSectionErrorBoundary>

      <div className="home-atlas-2a">
        <HomeSectionErrorBoundary name="v31-local-pulse">
          <LocalPulseSection
            districtName={data.districtName}
            districtNameHi={data.districtNameHi}
            localAlerts={data.localAlerts}
            breakingStory={data.leadStory.isBreaking ? data.leadStory : null}
          />
        </HomeSectionErrorBoundary>

        <HomeSectionErrorBoundary name="v31-lead">
          <LeadStorySection story={data.leadStory} districtLabel={districtLabel} />
        </HomeSectionErrorBoundary>

        <HomeSectionErrorBoundary name="v31-quick-scan">
          <QuickScanSection stories={data.quickScan} districtLabel={districtLabel} />
        </HomeSectionErrorBoundary>
      </div>

      <HomeSectionErrorBoundary name="v31-ad-mid">
        <AdSlot
          slotId="home_mid_feed"
          format="rectangle"
          responsiveSizes="(max-width: 359px) 300x250, 336x280"
          minReservedHeight={250}
          collapseIfEmpty
          className="home-v31-ad"
        />
      </HomeSectionErrorBoundary>

      <HomeSectionErrorBoundary name="v31-top-ten-audio">
        <TopTenAudioSection shorts={data.audioShorts} />
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
              districtLabel={districtLabel}
            />
          </LazyV3Section>
        </HomeSectionErrorBoundary>

        <HomeSectionErrorBoundary name="v31-deep-dive">
          <DeepDiveSections streams={data.categoryStreams} />
        </HomeSectionErrorBoundary>

        <HomeSectionErrorBoundary name="v31-ad-footer">
          <AdSlot
            slotId="home_footer"
            format="leaderboard"
            responsiveSizes="(max-width: 767px) 320x50, 728x90"
            minReservedHeight={50}
            collapseIfEmpty
            className="home-v31-ad"
          />
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
