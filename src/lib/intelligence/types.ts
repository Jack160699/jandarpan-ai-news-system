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

export type SentimentInsight = {
  articleId?: string;
  signalId?: string;
  label: "negative" | "neutral" | "positive";
  score: number;
  polarity: number;
};

export type PoliticalSensitivityInsight = {
  articleId?: string;
  score: number;
  level: RiskLevel;
  topics: string[];
};

export type TrendAcceleration = {
  topic: string;
  acceleration: number;
  velocity1h: number;
  velocity6h: number;
  score: number;
  alert: boolean;
  sampleHeadlines: string[];
};

export type FactCheckSuggestion = {
  id: string;
  priority: "high" | "medium" | "low";
  check: string;
  category: string;
};

export type DistrictRiskAlert = {
  districtSlug: string;
  districtName: string;
  riskScore: number;
  level: RiskLevel;
  articleCount: number;
  breakingCount: number;
  alert: boolean;
  message: string;
};

export type SourceReputationMemory = {
  sourceKey: string;
  sourceName: string;
  reputationScore: number;
  credibilityScore: number;
  misinfoIncidents: number;
  verifiedHits: number;
  totalSignals: number;
  lastSeenAt: string | null;
};

export type LiveSignalFeedItem = {
  signalId: string;
  title: string;
  provider: string;
  source: string | null;
  region: string | null;
  category: string | null;
  publishedAt: string | null;
  ingestedAt: string;
  misinfoRisk: number;
  sentiment: string;
  politicalSensitivity: number;
  breakingProbability: number;
  articleUrl: string;
};

export type SemanticClusterInsight = {
  clusterId: string;
  memberIds: string[];
  centroidTitle: string;
  avgSimilarity: number;
  method: "embedding" | "headline_fallback";
};

export type VectorDuplicateMatch = {
  entityId: string;
  entityType: string;
  similarity: number;
  headline?: string;
};

export type EventGraphNode = {
  eventId: string;
  title: string;
  urgencyScore: number;
  signalCount: number;
  region: string | null;
  category: string | null;
};

export type EventGraphEdge = {
  fromEventId: string;
  toEventId: string;
  relationship: string;
  weight: number;
};

export type ConfidenceHeatCell = {
  key: string;
  label: string;
  confidence: number;
  count: number;
};

export type IngestionAnalysis = {
  signalsIngested24h: number;
  embeddedCount: number;
  avgMisinfoRisk: number;
  avgBreakingProbability: number;
  topProviders: Array<{ provider: string; count: number }>;
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
    semanticClusters: number;
    liveSignals: number;
    districtAlerts: number;
    vectorIndexed: number;
  };
  fakeNewsRisks: FakeNewsRisk[];
  topRisks: Array<FakeNewsRisk & { articleId: string; headline: string }>;
  sourceTrust: SourceTrustScore[];
  sourceReputation: SourceReputationMemory[];
  duplicates: DuplicateMatch[];
  vectorDuplicates: VectorDuplicateMatch[];
  eventClusters: EventClusterInsight[];
  semanticClusters: SemanticClusterInsight[];
  eventGraph: { nodes: EventGraphNode[]; edges: EventGraphEdge[] };
  viralPredictions: ViralPrediction[];
  trendForecasts: TrendForecast[];
  trendAcceleration: TrendAcceleration[];
  topicMomentum: TopicMomentum[];
  recommendations: EditorialRecommendation[];
  districtHeatmap: DistrictHeatCell[];
  districtRiskAlerts: DistrictRiskAlert[];
  confidenceHeatmap: ConfidenceHeatCell[];
  breakingCandidates: BreakingCandidate[];
  seoOpportunities: SeoOpportunity[];
  multilingual: MultilingualPipelineStatus;
  articleCards: ArticleIntelligenceCard[];
  liveSignalFeed: LiveSignalFeedItem[];
  ingestionAnalysis: IngestionAnalysis;
  sentiments: SentimentInsight[];
  politicalSensitivity: PoliticalSensitivityInsight[];
  factCheckQueue: Array<FactCheckSuggestion & { articleId: string; headline: string }>;
};
