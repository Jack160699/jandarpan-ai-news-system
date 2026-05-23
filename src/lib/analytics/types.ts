/**
 * Newsroom analytics engine types
 */

export type ReaderEventType =
  | "page_view"
  | "article_view"
  | "article_click"
  | "dwell"
  | "scroll_depth"
  | "share"
  | "breaking_alert_view"
  | "search_click";

export type AnalyticsSurface =
  | "homepage"
  | "story"
  | "category"
  | "search"
  | "shorts"
  | "district"
  | "breaking"
  | "related";

export type ReaderEventInput = {
  eventType: ReaderEventType;
  articleSlug?: string;
  category?: string;
  region?: string;
  surface?: AnalyticsSurface;
  valueNum?: number;
  metadata?: Record<string, unknown>;
};

export type ArticlePerformanceRow = {
  slug: string;
  headline: string;
  category: string | null;
  region: string | null;
  views: number;
  clicks: number;
  ctr: number;
  avgDwellSec: number;
  avgScrollDepth: number;
  engagementScore: number;
  aiConfidence: number | null;
  isBreaking: boolean;
  publishedAt: string | null;
};

export type RegionalTrendRow = {
  region: string;
  views: number;
  clicks: number;
  articles: number;
  heat: number;
};

export type TopicHeatCell = {
  topic: string;
  category: string;
  count: number;
  avgEngagement: number;
  intensity: number;
};

export type BreakingVelocityRow = {
  slug: string;
  headline: string;
  views1h: number;
  views24h: number;
  velocityScore: number;
  isBreaking: boolean;
};

export type CategoryIntelligenceRow = {
  category: string;
  articles: number;
  views: number;
  clicks: number;
  ctr: number;
  avgScroll: number;
  shareOfTraffic: number;
};

export type TrendPoint = {
  label: string;
  views: number;
  clicks: number;
  engagements: number;
};

export type NewsroomAnalyticsReport = {
  fetchedAt: string;
  windowHours: number;
  privacyNote: string;
  summary: {
    totalViews: number;
    totalClicks: number;
    overallCtr: number;
    avgReadTimeSec: number;
    avgScrollDepth: number;
    engagedSessions: number;
    breakingVelocityPeak: number;
  };
  trendSeries: TrendPoint[];
  topArticles: ArticlePerformanceRow[];
  aiLeaders: ArticlePerformanceRow[];
  regionalHeatmap: RegionalTrendRow[];
  topicHeatmap: TopicHeatCell[];
  breakingVelocity: BreakingVelocityRow[];
  categoryIntelligence: CategoryIntelligenceRow[];
};
