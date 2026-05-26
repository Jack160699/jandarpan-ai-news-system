export type * from "@/lib/intelligence/types";
export { buildNewsroomIntelligenceSnapshot } from "@/lib/intelligence/build-snapshot";
export { enrichArticleIntelligence } from "@/lib/intelligence/enrich-article";
export { scoreFakeNewsRisk } from "@/lib/intelligence/fake-news-risk";
export { buildSourceTrustEngine, aggregateArticleTrust } from "@/lib/intelligence/source-trust";
export { detectDuplicateStories } from "@/lib/intelligence/duplicate-detection";
export { buildEventClusterInsights } from "@/lib/intelligence/event-clusters";
export { predictViralSpread } from "@/lib/intelligence/viral-prediction";
export { forecastTrends, buildTopicMomentum } from "@/lib/intelligence/trend-forecast";
export { buildAutomatedSummary, buildAiSummaryOptional } from "@/lib/intelligence/summaries";
export { buildEditorialRecommendations } from "@/lib/intelligence/recommendations";
export { buildDistrictHeatmap } from "@/lib/intelligence/district-heatmap";
export { detectBreakingCandidates } from "@/lib/intelligence/breaking-detector";
export { findSeoOpportunities } from "@/lib/intelligence/seo-opportunities";
export { getMultilingualPipelineStatus } from "@/lib/intelligence/multilingual-pipeline";
export { analyzeSentiment } from "@/lib/intelligence/sentiment-analysis";
export { scorePoliticalSensitivity } from "@/lib/intelligence/political-sensitivity";
export { detectTrendAcceleration } from "@/lib/intelligence/trend-acceleration";
export { suggestFactChecks } from "@/lib/intelligence/fact-check-suggestions";
export { buildDistrictRiskAlerts } from "@/lib/intelligence/district-risk-alerts";
export { analyzeLiveSignals } from "@/lib/intelligence/ingestion-analyzer";
export { buildEventRelationshipGraph } from "@/lib/intelligence/event-graph";
export {
  loadSourceReputationMemory,
  updateSourceReputationMemory,
  syncReputationFromIngestion,
} from "@/lib/intelligence/source-reputation-memory";
export { batchEmbedSignals, findSimilarByText, upsertEmbedding } from "@/lib/intelligence/vector/vector-store";
export { clusterByEmbeddings } from "@/lib/intelligence/vector/semantic-cluster";
