"use client";

import dynamic from "next/dynamic";
import type { CSSProperties } from "react";
import { AdSlot } from "@/components/monetization/AdSlot";
import { HomepageMasthead } from "@/components/homepage/HomepageMasthead";
import { LazyHomeSection } from "@/components/homepage/LazyHomeSection";
import { LocalBreakingAlerts } from "@/components/homepage/LocalBreakingAlerts";
import { LiveNewsroomStatus } from "@/components/live-newsroom/LiveNewsroomStatus";
import { NewUpdatesBanner } from "@/components/live-newsroom/NewUpdatesBanner";
import type { GeneratedHomepageFeed } from "@/lib/homepage/types";
import { LiveNewsroomProvider, useLiveNewsroom } from "@/providers/LiveNewsroomProvider";
import { BreakingHero } from "@/sections/homepage/BreakingHero";
import { BreakingTicker } from "@/sections/homepage/BreakingTicker";
import {
  HyperlocalSkeleton,
  LiveWireSkeleton,
  TrendingShortsSkeleton,
} from "@/sections/homepage/HomepageSectionSkeletons";
import { LiveWire } from "@/sections/homepage/LiveWire";
import { TrendingStories } from "@/sections/homepage/TrendingStories";

const HyperlocalFeeds = dynamic(
  () =>
    import("@/sections/homepage/HyperlocalFeeds").then((m) => ({
      default: m.HyperlocalFeeds,
    })),
  { loading: () => <HyperlocalSkeleton /> }
);

const TrendingShortsRail = dynamic(
  () =>
    import("@/components/shorts/TrendingShortsRail").then((m) => ({
      default: m.TrendingShortsRail,
    })),
  { loading: () => <TrendingShortsSkeleton /> }
);

type HomepageLiveViewProps = {
  feed: GeneratedHomepageFeed;
  brandName?: string;
};

export function HomepageLiveView({ feed, brandName }: HomepageLiveViewProps) {
  return (
    <LiveNewsroomProvider initialFeed={feed}>
      <HomepageLiveContent brandName={brandName} />
    </LiveNewsroomProvider>
  );
}

function HomepageLiveContent({ brandName }: { brandName?: string }) {
  const { feed, freshIds } = useLiveNewsroom();

  const { lead, supporting } = feed.editorsPicks;
  const topStories = [
    ...feed.breakingTicker.slice(0, 3),
    ...supporting.slice(0, 3),
  ].filter((a, i, arr) => arr.findIndex((x) => x.id === a.id) === i);

  const heroLead = feed.breakingTicker[0] ?? lead;

  return (
    <div className="nr nr--daily pl-stagger motion-page">
      <div className="pl-stagger-item">
        <HomepageMasthead brandName={brandName} />
        <LiveNewsroomStatus />
      </div>

      <NewUpdatesBanner />

      {feed.breakingTicker.length > 0 ? (
        <div className="pl-stagger-item">
          <BreakingTicker items={feed.breakingTicker} freshIds={freshIds} />
        </div>
      ) : null}

      <div className="pl-stagger-item">
        <BreakingHero
          lead={heroLead}
          topStories={topStories}
          featuredShort={feed.newsShorts[0]}
        />
      </div>

      <div className="pl-stagger-item">
        <LocalBreakingAlerts alerts={feed.localBreakingAlerts} />
      </div>

      <LazyHomeSection
        id="wire"
        minHeight="200px"
        fallback={<LiveWireSkeleton />}
        className="nr-live-wire"
        style={{ "--stagger": 2 } as CSSProperties}
      >
        <LiveWire items={feed.liveWire} freshIds={freshIds} />
      </LazyHomeSection>

      {feed.newsShorts.length > 0 ? (
        <LazyHomeSection
          minHeight="280px"
          fallback={<TrendingShortsSkeleton />}
          className="hp-rail"
          style={{ "--stagger": 3 } as CSSProperties}
        >
          <TrendingShortsRail shorts={feed.newsShorts} />
        </LazyHomeSection>
      ) : null}

      <div
        className="feed-section pl-stagger-item"
        style={{ "--stagger": 4 } as CSSProperties}
      >
        <TrendingStories articles={feed.trending.slice(0, 8)} freshIds={freshIds} />
      </div>

      <LazyHomeSection
        minHeight="200px"
        fallback={<HyperlocalSkeleton />}
        style={{ "--stagger": 5 } as CSSProperties}
      >
        <HyperlocalFeeds feeds={feed.hyperlocalFeeds.slice(0, 6)} />
      </LazyHomeSection>

      <div className="nr-wrap nr-ad-slot pl-stagger-item">
        <AdSlot slotId="home_mid_feed" />
      </div>
    </div>
  );
}
