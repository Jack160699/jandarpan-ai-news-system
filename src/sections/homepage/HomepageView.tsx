import { AdSlot } from "@/components/monetization/AdSlot";
import { PremiumReportsRail } from "@/components/monetization/PremiumReportsRail";
import { TrendingKeywordsBar } from "@/components/seo/TrendingKeywordsBar";
import type { GeneratedHomepageFeed } from "@/lib/homepage/types";
import { buildTrendingKeywords } from "@/lib/seo/trending-keywords";
import { BreakingTicker } from "@/sections/homepage/BreakingTicker";
import { CategoryStreams } from "@/sections/homepage/CategoryStreams";
import { EditorsPicks } from "@/sections/homepage/EditorsPicks";
import { FooterIntelligenceSection } from "@/sections/homepage/FooterIntelligence";
import { LiveWire } from "@/sections/homepage/LiveWire";
import { QuickReads } from "@/sections/homepage/QuickReads";
import { ShortsAutoplayRail } from "@/components/shorts/ShortsAutoplayRail";
import { HyperlocalFeeds } from "@/sections/homepage/HyperlocalFeeds";
import { RegionalHighlights } from "@/sections/homepage/RegionalHighlights";
import { TrendingStories } from "@/sections/homepage/TrendingStories";

type HomepageViewProps = {
  feed: GeneratedHomepageFeed;
};

export function HomepageView({ feed }: HomepageViewProps) {
  const trending = buildTrendingKeywords({
    limit: 10,
  });

  return (
    <div className="nr ds-fade-in">
      <div className="nr-wrap">
        <TrendingKeywordsBar keywords={trending} />
        <AdSlot slotId="home_leaderboard" className="mnr-unit--mobile-only" />
      </div>
      <BreakingTicker items={feed.breakingTicker} />
      <EditorsPicks picks={feed.editorsPicks} />
      <LiveWire items={feed.liveWire} />
      <RegionalHighlights articles={feed.regionalHighlights} />
      <HyperlocalFeeds feeds={feed.hyperlocalFeeds} />
      <TrendingStories articles={feed.trending} />
      <div className="nr-wrap">
        <AdSlot slotId="home_mid_feed" />
        <PremiumReportsRail />
      </div>
      <ShortsAutoplayRail shorts={feed.newsShorts} />
      <QuickReads articles={feed.shorts} />
      <CategoryStreams streams={feed.categoryStreams} />
      <div className="nr-wrap">
        <AdSlot slotId="home_footer" />
      </div>
      <FooterIntelligenceSection data={feed.footerIntelligence} />
    </div>
  );
}
