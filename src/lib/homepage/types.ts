/**
 * Homepage feed types — generated_articles only
 */

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
  /** @deprecated use priorityScore — kept for UI compatibility */
  trendScore: number;
  priorityScore: number;
  ranking: HomeRankingMeta;
  language: string;
  tags: string[];
  aiConfidence: number;
};

export type RegionalSectionBlock = {
  id: HomeSectionId;
  label: string;
  labelHi: string;
  articles: HomeArticle[];
};

export type GeneratedHomepageFeed = {
  hero: HomeArticle;
  liveUpdates: HomeArticle[];
  regional: RegionalSectionBlock[];
  trending: HomeArticle[];
  shorts: HomeArticle[];
  fetchedAt: string;
  rankingAnalytics?: {
    poolSize: number;
    trendingCount: number;
    breakingCount: number;
    avgPriorityScore: number;
  };
};
