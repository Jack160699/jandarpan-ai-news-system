/**
 * AI Newsroom Intelligence Layer — shared types
 */

export type RiskLevel = "low" | "medium" | "high" | "critical";

export type FakeNewsRisk = {
  score: number;
  level: RiskLevel;
  signals: string[];
  recommendation: string;
};

export type SourceTrustScore = {
  sourceId: string;
  sourceName: string;
  provider: string;
  trustScore: number;
  tier: "trusted" | "standard" | "watch" | "untrusted";
  articleCount: number;
  failureRate: number;
};

export type DuplicateMatch = {
  articleId: string;
  headline: string;
  clusterId: string;
  similarity: number;
  clusterSize: number;
  nearestHeadline: string | null;
};

export type EventClusterInsight = {
  eventId: string;
  canonicalTitle: string;
  signalCount: number;
  sourceCount: number;
  urgencyScore: number;
  mergeConfidence: number;
  region: string | null;
  category: string | null;
  createdAt: string;
};

export type ViralPrediction = {
  articleId: string;
  slug: string;
  headline: string;
  viralScore: number;
  shareVelocity: number;
  engagementPotential: number;
  hoursToPeak: number | null;
};

export type TrendForecast = {
  topic: string;
  direction: "rising" | "stable" | "falling";
  momentum: number;
  forecast24h: number;
  sampleHeadlines: string[];
};

export type TopicMomentum = {
  topicKey: string;
  label: string;
  momentum: number;
  articleCount: number;
  velocity: number;
};

export type EditorialRecommendation = {
  id: string;
  priority: "high" | "medium" | "low";
  action: string;
  reason: string;
  articleId?: string;
  eventId?: string;
};

export type DistrictHeatCell = {
  districtSlug: string;
  districtName: string;
  intensity: number;
  articleCount: number;
  breakingCount: number;
  avgConfidence: number;
};

export type BreakingCandidate = {
  articleId: string;
  headline: string;
  breakingScore: number;
  urgencyScore: number;
  publishedAt: string | null;
  reasons: string[];
};

export type SeoOpportunity = {
  articleId: string;
  slug: string;
  headline: string;
  seoScore: number;
  gap: string;
  suggestedAction: string;
  priority: number;
};

export type MultilingualPipelineStatus = {
  enabled: boolean;
  targetLanguages: string[];
  pendingCount: number;
  completedCount: number;
  lastTranslatedAt: string | null;
};

export type ArticleIntelligenceCard = {
  articleId: string;
  slug: string;
  headline: string;
  fakeNewsRisk: FakeNewsRisk;
  trustScore: number;
  duplicateClusterId: string | null;
  viralScore: number;
  momentum: number;
  breakingScore: number;
  seoScore: number;
  summary: string;
  language: string | null;
  translationLocales: string[];
};

export type NewsroomIntelligenceSnapshot = {
  fetchedAt: string;
  summary: {
    articlesAnalyzed: number;
    eventsClustered: number;
    highRiskCount: number;
    breakingCandidates: number;
    duplicateClusters: number;
    avgTrustScore: number;
    avgViralScore: number;
  };
  fakeNewsRisks: FakeNewsRisk[];
  topRisks: Array<FakeNewsRisk & { articleId: string; headline: string }>;
  sourceTrust: SourceTrustScore[];
  duplicates: DuplicateMatch[];
  eventClusters: EventClusterInsight[];
  viralPredictions: ViralPrediction[];
  trendForecasts: TrendForecast[];
  topicMomentum: TopicMomentum[];
  recommendations: EditorialRecommendation[];
  districtHeatmap: DistrictHeatCell[];
  breakingCandidates: BreakingCandidate[];
  seoOpportunities: SeoOpportunity[];
  multilingual: MultilingualPipelineStatus;
  articleCards: ArticleIntelligenceCard[];
};
