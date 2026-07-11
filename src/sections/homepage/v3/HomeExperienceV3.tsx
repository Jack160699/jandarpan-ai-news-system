"use client";

import type { GeneratedHomepageFeed } from "@/lib/homepage/types";
import { PageContainer } from "@/layouts/PageContainer";
import { HomeSectionErrorBoundary } from "@/components/errors/HomeSectionErrorBoundary";
import { useReaderAccount } from "@/providers/ReaderAccountProvider";
import { useReaderPreferences } from "@/providers/ReaderPreferencesProvider";
import { useEditorialIntelligenceOptional } from "@/providers/EditorialIntelligenceProvider";
import { getRecentReadSlugs } from "@/lib/reading-memory";
import { useHomepageLayout } from "@/hooks/useHomepageLayout";
import { useHomeV3Data } from "./hooks/useHomeV3Data";
import { LazyV3Section } from "./components/LazyV3Section";
import { GreetingSection } from "./sections/GreetingSection";
import { TodaysBriefSection } from "./sections/TodaysBriefSection";
import { BreakingStorySection } from "./sections/BreakingStorySection";
import { TopStoriesSection } from "./sections/TopStoriesSection";
import { MyDistrictSection } from "./sections/MyDistrictSection";
import { LiveUpdatesSection } from "./sections/LiveUpdatesSection";
import { ContinueReadingSection } from "./sections/ContinueReadingSection";
import { RecommendedSection } from "./sections/RecommendedSection";
import { ExploreSection } from "./sections/ExploreSection";
import {
  BriefSkeleton,
  BreakingSkeleton,
  DistrictSkeleton,
  LiveRailSkeleton,
  SectionBlockSkeleton,
  TopStoriesSkeleton,
} from "./skeletons";
import "./styles/home-v3.css";

export type HomeExperienceV3Props = {
  feed: GeneratedHomepageFeed;
};

/**
 * JDP-003 — Home Experience V3
 *
 * Editorial story flow: Greeting → Brief → Breaking → Top Stories →
 * District → Live → Continue → Recommended → Explore
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
    <PageContainer width="homepage" className="home-v3">
      <HomeSectionErrorBoundary name="v3-greeting">
        <GreetingSection />
      </HomeSectionErrorBoundary>

      <HomeSectionErrorBoundary name="v3-brief">
        <TodaysBriefSection brief={data.brief} />
      </HomeSectionErrorBoundary>

      <HomeSectionErrorBoundary name="v3-breaking">
        <BreakingStorySection story={data.breakingStory} />
      </HomeSectionErrorBoundary>

      <HomeSectionErrorBoundary name="v3-top-stories">
        <LazyV3Section
          id="home-v3-top"
          fallback={<TopStoriesSkeleton />}
          minHeight="400px"
        >
          <TopStoriesSection stories={data.topStories} />
        </LazyV3Section>
      </HomeSectionErrorBoundary>

      <HomeSectionErrorBoundary name="v3-district">
        <LazyV3Section
          id="home-v3-district"
          fallback={<DistrictSkeleton />}
          minHeight="360px"
        >
          <MyDistrictSection
            districtSlug={data.districtSlug}
            districtNews={data.districtNews}
          />
        </LazyV3Section>
      </HomeSectionErrorBoundary>

      <HomeSectionErrorBoundary name="v3-live">
        <LazyV3Section
          id="home-v3-live"
          fallback={<LiveRailSkeleton />}
          minHeight="160px"
        >
          <LiveUpdatesSection updates={data.liveUpdates} />
        </LazyV3Section>
      </HomeSectionErrorBoundary>

      <HomeSectionErrorBoundary name="v3-continue">
        <ContinueReadingSection />
      </HomeSectionErrorBoundary>

      <HomeSectionErrorBoundary name="v3-recommended">
        <LazyV3Section
          id="home-v3-recommended"
          fallback={<SectionBlockSkeleton />}
          minHeight="280px"
        >
          <RecommendedSection
            recommended={data.recommended}
            trendingFallback={data.trendingFallback}
          />
        </LazyV3Section>
      </HomeSectionErrorBoundary>

      <HomeSectionErrorBoundary name="v3-explore">
        <LazyV3Section
          id="home-v3-explore"
          fallback={<SectionBlockSkeleton />}
          minHeight="320px"
        >
          <ExploreSection />
        </LazyV3Section>
      </HomeSectionErrorBoundary>
    </PageContainer>
  );
}
