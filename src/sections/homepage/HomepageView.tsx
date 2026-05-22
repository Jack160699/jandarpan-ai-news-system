import type { GeneratedHomepageFeed } from "@/lib/homepage/types";
import { HeroStory } from "@/sections/homepage/HeroStory";
import { LiveUpdatesRail } from "@/sections/homepage/LiveUpdatesRail";
import { RegionalSections } from "@/sections/homepage/RegionalSections";
import { ShortsSection } from "@/sections/homepage/ShortsSection";
import { TrendingSection } from "@/sections/homepage/TrendingSection";

type HomepageViewProps = {
  feed: GeneratedHomepageFeed;
};

export function HomepageView({ feed }: HomepageViewProps) {
  return (
    <div className="hp ds-fade-in">
      <HeroStory article={feed.hero} />
      <LiveUpdatesRail updates={feed.liveUpdates} />
      <RegionalSections sections={feed.regional} />
      <TrendingSection articles={feed.trending} />
      <ShortsSection articles={feed.shorts} />
    </div>
  );
}
