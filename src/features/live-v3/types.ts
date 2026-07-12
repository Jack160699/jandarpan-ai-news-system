import type { GeneratedHomepageFeed, HomeArticle } from "@/lib/homepage/types";
import type { FeaturedDistrictSlug } from "@/lib/homepage/district-filter";

export type LiveV3Scope = "all" | "breaking" | "developing";

export type LiveV3ViewMode = "feed" | "timeline";

export type LiveV3EventGroup = {
  id: string;
  title: string;
  items: HomeArticle[];
  isBreaking: boolean;
  isLive: boolean;
  latestAt: string;
  updateCount: number;
};

export type LiveV3TimelineEntry = {
  id: string;
  timestamp: string;
  headline: string;
  slug: string;
  isLive: boolean;
  isBreaking: boolean;
  groupId: string;
};

export type LiveV3FilterState = {
  scope: LiveV3Scope;
  district: FeaturedDistrictSlug | null;
  viewMode: LiveV3ViewMode;
};

export type LiveExperienceV3Props = {
  feed: GeneratedHomepageFeed;
  /** Simulate initial load for skeleton demo */
  simulateLoadMs?: number;
};

export type LiveBadgeProps = {
  label?: string;
  variant?: "default" | "breaking" | "compact";
  pulse?: boolean;
};
