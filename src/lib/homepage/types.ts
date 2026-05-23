/**
 * Homepage feed types — generated_articles newsroom layout
 */

import type { NewsShortCard } from "@/lib/news/shorts/types";
import type { NewsDeskLabel } from "@/lib/newsroom/desk-branding";

export type HomeSectionId =
  | "chhattisgarh"
  | "raipur"
  | "india"
  | "world"
  | "business"
  | "sports"
  | "education";

export type HomeUrgency = "high" | "medium" | "low";

export type HomeRankingMeta = {
  priorityScore: number;
  reasons: string[];
  isTrending: boolean;
  isBreaking: boolean;
  duplicateClusterId: string | null;
};

export type HomeArticle = {
  id: string;
  slug: string;
  headline: string;
  summary: string;
  imageUrl: string;
  ogImageUrl: string;
  section: HomeSectionId;
  readingTime: string;
  publishedAt: string;
  isLive: boolean;
  urgency: HomeUrgency;
  /** @deprecated use priorityScore */
  trendScore: number;
  priorityScore: number;
  ranking: HomeRankingMeta;
  language: string;
  tags: string[];
  aiConfidence: number;
  sourceCount: number;
  categoryLabel: string;
  desk: NewsDeskLabel;
};

export type RegionalSectionBlock = {
  id: HomeSectionId;
  label: string;
  labelHi: string;
  articles: HomeArticle[];
};

export type EditorsPicksBlock = {
  lead: HomeArticle;
  supporting: HomeArticle[];
};

export type FooterIntelligence = {
  fetchedAt: string;
  storyCount: number;
  breakingCount: number;
  trendingCount: number;
  avgConfidence: number;
  trendingSearches: string[];
};

export type HyperlocalFeedSummary = {
  districtSlug: string;
  districtName: string;
  districtNameHi: string;
  articleCount: number;
  topHeadline: string | null;
};

/** Premium AI newsroom homepage — 8 sections */
export type GeneratedHomepageFeed = {
  breakingTicker: HomeArticle[];
  editorsPicks: EditorsPicksBlock;
  liveWire: HomeArticle[];
  regionalHighlights: HomeArticle[];
  trending: HomeArticle[];
  shorts: HomeArticle[];
  newsShorts: NewsShortCard[];
  categoryStreams: RegionalSectionBlock[];
  footerIntelligence: FooterIntelligence;
  hyperlocalFeeds: HyperlocalFeedSummary[];
  localBreakingAlerts: Array<{
    slug: string;
    headline: string;
    district: string | null;
    urgency: string;
  }>;
  fetchedAt: string;
};
