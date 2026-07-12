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
  /** Editorial workflow — used for honest trust badges only */
  editorialStatus?: string | null;
  publishDecision?: string | null;
  aiGenerated?: boolean;
  hasOfficialSource?: boolean;
  categoryLabel: string;
  desk: NewsDeskLabel;
  /** @deprecated Language filtering happens before feed assembly */
  localeMatch?: boolean;
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

export type EditorialDeskBlock = {
  id: string;
  label: string;
  labelHi: string;
  articles: HomeArticle[];
  collapsed?: boolean;
};

export type HomepageDeskQuality = {
  categoryDiversity: number;
  districtDiversity: number;
  avgFreshnessHours: number;
  avgConfidence: number;
  avgImageQuality: number;
  duplicateCount: number;
  sectionCompletionPct: number;
  heroQuality: number;
  desksFilled: number;
  desksTotal: number;
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
  /** Article ids for listen queue — separate pool, max 2 homepage overlap */
  listenArticleIds?: string[];
  categoryStreams: RegionalSectionBlock[];
  /** Editorial desk quotas — composition metadata (collapse when empty) */
  editorialDesks?: EditorialDeskBlock[];
  deskQuality?: HomepageDeskQuality;
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
