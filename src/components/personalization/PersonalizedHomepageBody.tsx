"use client";

import { useMemo, type CSSProperties, type ReactNode } from "react";
import {
  HeroNewsCard,
  NewsGrid,
  ShortsSection,
} from "@/components/layout";
import { SectionHeader } from "@/components/homepage/SectionHeader";
import { StoryCard } from "@/components/homepage/StoryCard";
import { LazyHomeSection } from "@/components/homepage/LazyHomeSection";
import { LocalBreakingAlerts } from "@/components/homepage/LocalBreakingAlerts";
import { HomeSectionErrorBoundary } from "@/components/errors/HomeSectionErrorBoundary";
import type { GeneratedHomepageFeed } from "@/lib/homepage/types";
import {
  hasValidHomeLead,
  safeArticleRanking,
} from "@/lib/homepage/feed-safety";
import { useLiveNewsroom } from "@/providers/LiveNewsroomProvider";
import { useLanguage } from "@/providers/LanguageProvider";
import { useLocalizedFeed } from "@/hooks/useLocalizedFeed";
import { HyperlocalFeeds } from "@/lib/lazy/hyperlocal-feeds";
import { HyperlocalSkeleton } from "@/sections/homepage/HomepageSectionSkeletons";
import { HomeDeskSplit } from "@/components/home/HomeDeskSplit";
import { HighlightsDeskSkeleton } from "@/components/home/HighlightsDeskSkeleton";
import { sortHomepageModules } from "@/lib/personalization/homepage-layout";
import { useHomepageLayout } from "@/hooks/useHomepageLayout";
import { useReaderAccount } from "@/providers/ReaderAccountProvider";
import { useReaderPreferences } from "@/providers/ReaderPreferencesProvider";
import type { HomepageModuleId } from "@/lib/personalization/types";
import { RecommendedForYou } from "@/components/personalization/RecommendedForYou";
import { PersonalizationOnboarding } from "@/components/personalization/PersonalizationOnboarding";
import { DistrictQuickSwitch } from "@/components/personalization/DistrictQuickSwitch";
import { HomepageCustomizePanel } from "@/components/personalization/HomepageCustomizePanel";

type PersonalizedHomepageBodyProps = {
  feed: GeneratedHomepageFeed;
};

export function PersonalizedHomepageBody({ feed }: PersonalizedHomepageBodyProps) {
  const { feed: liveFeed, freshIds } = useLiveNewsroom();
  const { t } = useLanguage();
  const localized = useLocalizedFeed(liveFeed);
  const resolvedFeed = localized ?? feed;
  const { layout } = useHomepageLayout();
  const { interests } = useReaderAccount();
  const { prefs } = useReaderPreferences();

  const moduleOrder = useMemo(
    () =>
      sortHomepageModules(layout, {
        interestIds: interests,
        homeDistrict: prefs.homeDistrict ?? null,
        followedDistricts: layout.followedDistricts,
      }),
    [layout, interests, prefs.homeDistrict]
  );

  if (!resolvedFeed || !hasValidHomeLead(resolvedFeed)) return null;

  const lead = resolvedFeed.editorsPicks.lead;
  const supporting = resolvedFeed.editorsPicks.supporting ?? [];
  const topStories = supporting
    .filter(
      (a, i, arr) =>
        a?.id &&
        a.id !== lead.id &&
        a.headline?.trim() &&
        arr.findIndex((x) => x?.id === a.id) === i
    )
    .slice(0, 4);

  const heroSafe = { ...lead, ranking: safeArticleRanking(lead) };

  const modules: Record<HomepageModuleId, ReactNode> = {
    "highlights-desk": (
      <HomeSectionErrorBoundary name="highlights-desk">
        <LazyHomeSection
          id="highlights-desk"
          minHeight="0"
          className="home-highlights-desk-lazy"
          fallback={<HighlightsDeskSkeleton />}
          style={{ "--stagger": 2 } as CSSProperties}
        >
          <HomeDeskSplit feed={resolvedFeed} freshIds={freshIds} />
        </LazyHomeSection>
      </HomeSectionErrorBoundary>
    ),
    recommended: (
      <HomeSectionErrorBoundary name="recommended">
        <RecommendedForYou feed={resolvedFeed} />
      </HomeSectionErrorBoundary>
    ),
    shorts:
      (resolvedFeed.newsShorts?.length ?? 0) > 0 ? (
        <HomeSectionErrorBoundary name="shorts">
          <ShortsSection shorts={resolvedFeed.newsShorts} />
        </HomeSectionErrorBoundary>
      ) : null,
    trending:
      (resolvedFeed.trending?.length ?? 0) > 0 ? (
        <HomeSectionErrorBoundary name="trending">
          <NewsGrid
            id="trending"
            title={t.home.trending}
            articles={resolvedFeed.trending.slice(0, 6)}
            freshIds={freshIds}
          />
        </HomeSectionErrorBoundary>
      ) : null,
    hyperlocal:
      (resolvedFeed.hyperlocalFeeds?.length ?? 0) > 0 ? (
        <HomeSectionErrorBoundary name="hyperlocal">
          <LazyHomeSection
            minHeight="160px"
            fallback={<HyperlocalSkeleton />}
            style={{ "--stagger": 5 } as CSSProperties}
          >
            <HyperlocalFeeds feeds={resolvedFeed.hyperlocalFeeds.slice(0, 4)} />
          </LazyHomeSection>
        </HomeSectionErrorBoundary>
      ) : null,
  };

  return (
    <>
      <div className="hp-personalization-bar">
        <DistrictQuickSwitch />
        <HomepageCustomizePanel />
      </div>

      <PersonalizationOnboarding />

      <HomeSectionErrorBoundary name="hero">
        <div className="hp-section hp-section--primary hp-hero-section">
          <HeroNewsCard
            lead={heroSafe}
            topStories={topStories}
            featuredShort={resolvedFeed.newsShorts?.[0]}
          />
        </div>
      </HomeSectionErrorBoundary>

      {topStories.length > 0 ? (
        <section
          className="hp-section hp-section--secondary hp-editors-mobile"
          aria-labelledby="editors-mobile-title"
        >
          <SectionHeader
            id="editors-mobile-title"
            title={t.home.topHeadlines}
          />
          <ul className="hp-editors-mobile__list" role="list">
            {topStories.map((story, index) => (
              <li key={story.id}>
                <StoryCard
                  article={story}
                  variant="compact"
                  rank={index + 1}
                  priority={index === 0}
                />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="home-body">
        <div className="home-body__main home-feed-stack">
          {moduleOrder.map((id) => (
            <div key={id}>{modules[id]}</div>
          ))}
        </div>

        <aside className="home-body__aside" aria-label="Local desk">
          <HomeSectionErrorBoundary name="local-alerts">
            <LocalBreakingAlerts alerts={resolvedFeed.localBreakingAlerts ?? []} />
          </HomeSectionErrorBoundary>
        </aside>
      </div>
    </>
  );
}
