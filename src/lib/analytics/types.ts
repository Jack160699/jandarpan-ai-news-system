/**
 * Newsroom analytics engine types
 */

import type { JsonObject } from "@/types/json";

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
  metadata?: JsonObject;
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

export type RankedArticle = ArticlePerformanceRow & {
  rank: number;
  rankScore: number;
  rankFactors: string[];
};

export type LiveReadersSnapshot = {
  activeReaders: number;
  activeSessions5m: number;
  peakReaders24h: number;
  viewsPerMinute: number;
};

export type AudienceRetentionPoint = {
  label: string;
  returningSessions: number;
  newSessions: number;
  retentionRate: number;
};

export type SeoRankingRow = {
  slug: string;
  headline: string;
  seoScore: number;
  organicViews: number;
  ctr: number;
  searchClicks: number;
  positionEstimate: number;
};

export type SourcePerformanceRow = {
  sourceKey: string;
  sourceName: string;
  provider: string;
  articles: number;
  views: number;
  avgTrust: number;
  avgEngagement: number;
};

export type NewsroomProductivity = {
  articlesPublished: number;
  articlesDraft: number;
  workflowTransitions: number;
  avgTimeToPublishHours: number | null;
  deskActions24h: number;
};

export type PublishingVelocityPoint = {
  label: string;
  published: number;
  drafted: number;
};

export type AiConfidenceTrendPoint = {
  label: string;
  avgConfidence: number;
  articleCount: number;
};

export type DistrictEngagementRow = {
  district: string;
  views: number;
  clicks: number;
  ctr: number;
  articles: number;
  engagementScore: number;
};

export type CtrAnalytics = {
  overall: number;
  bySurface: Array<{ surface: string; ctr: number; views: number; clicks: number }>;
  topClickDrivers: Array<{ slug: string; headline: string; ctr: number; clicks: number }>;
};

export type ScrollDepthBucket = {
  bucket: string;
  count: number;
  pct: number;
};

export type AdminInsight = {
  id: string;
  severity: "info" | "warning" | "success";
  title: string;
  detail: string;
};

export type ScheduledReportRow = {
  id: string;
  name: string;
  frequency: "daily" | "weekly" | "monthly";
  format: "csv" | "json";
  windowHours: number;
  email: string | null;
  enabled: boolean;
  lastRunAt: string | null;
  nextRunAt: string | null;
};

export type EnterpriseAnalyticsReport = NewsroomAnalyticsReport & {
  liveReaders: LiveReadersSnapshot;
  rankedArticles: RankedArticle[];
  districtEngagement: DistrictEngagementRow[];
  seoRankings: SeoRankingRow[];
  ctrAnalytics: CtrAnalytics;
  audienceRetention: AudienceRetentionPoint[];
  scrollDepth: ScrollDepthBucket[];
  sourcePerformance: SourcePerformanceRow[];
  productivity: NewsroomProductivity;
  publishingVelocity: PublishingVelocityPoint[];
  aiConfidenceTrend: AiConfidenceTrendPoint[];
  geographicAnalytics: RegionalTrendRow[];
  adminInsights: AdminInsight[];
  scheduledReports: ScheduledReportRow[];
};
