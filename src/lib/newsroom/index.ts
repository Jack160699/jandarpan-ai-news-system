/**
 * AI-native newsroom pipeline
 *
 * Flow:
 *   providers → news_signals (raw, private)
 *            → news_events (clustered, private) [optional]
 *            → generated_articles (public editorial)
 *            → news_articles (legacy bridge for current homepage)
 */

export { logNewsroom, logNewsroomError } from "@/lib/newsroom/logger";
export {
  persistNewsSignals,
  normalizedToSignal,
  assertPersistenceOk,
  derivePersistFlags,
  emptySignalPersistResult,
  type SignalPersistResult,
} from "@/lib/newsroom/signals/persist";
export {
  publishToLegacyArticles,
  isLegacyBridgeEnabled,
  type LegacyPublishResult,
} from "@/lib/newsroom/bridge/legacy-publish";
export { clusterRecentSignals } from "@/lib/newsroom/events/cluster";
export {
  getEvolvingCoverageBySlug,
  getLiveCoverageSlugs,
} from "@/lib/news/coverage/read";
export {
  fetchEventCoverageBundle,
  fetchEventCoverageBundleById,
  fetchEventRowById,
  fetchEventRowByCoverageSlug,
  type EventCoverageBundle,
} from "@/lib/news/coverage/fetch-event-bundle";
export {
  buildEventViewModel,
  getEventViewModel,
  getEventViewModelFromBundle,
  type EventViewModel,
  type EventLatestUpdate,
  type EventSourceAttribution,
  type EventRelatedMetadata,
  type EventCoverageStatistics,
} from "@/lib/events/event-view-model";
export {
  hasMeaningfulEventCoverage,
  resolveStoryTimelineEvents,
  coverageTimelineToStoryEvents,
  formatEventStatusLabel,
  formatUpdateTypeLabel,
  formatClusterConfidenceLabel,
  buildEventProgressLines,
} from "@/lib/events/event-story-adapter";
export { computeClusterConfidence } from "@/lib/news/coverage/confidence";
export {
  clusterSignalsIntoEvents,
  fetchUnprocessedSignals,
  scoreSourceConfidence,
} from "@/lib/news/ai/event-clustering";
export type {
  ClusterSignalsResult,
  DuplicateDetectionAnalytics,
} from "@/lib/news/ai/event-clustering";
export {
  publishGeneratedFromEvents,
  isGeneratedArticlesHomepageEnabled,
} from "@/lib/newsroom/generated/publish";
export {
  generateEditorialFromEvent,
  generateEditorialsFromEvents,
} from "@/lib/news/ai/generate-article";
export type {
  EditorialDraft,
  EditorialGenerationResult,
  BatchEditorialResult,
  SupportedEditorialLanguage,
} from "@/lib/news/ai/generate-article";
export {
  runEditorialQualityChecks,
  logEditorialDecision,
  type EditorialQualityReport,
  type SourceAttribution,
} from "@/lib/news/ai/editorial-guards";
export {
  analyzeEditorialIntelligence,
  logQualityBreakdown,
  type EditorialIntelligenceResult,
  type PublishDecision,
} from "@/lib/news/ai/editorial-intelligence";
export {
  rankArticlesForHomepage,
  computeHomepagePriorityScore,
  detectTrendingArticleIds,
  logHomepageRankingAnalytics,
} from "@/lib/news/ai/ranking";
export type {
  RankingMetadata,
  RankingFactorBreakdown,
  RankingPersonalization,
  HomepageRankingAnalytics,
} from "@/lib/news/ai/ranking";
export {
  resolveEditorialHeroImage,
  processEditorialImageQueue,
  queueEditorialImageForArticle,
  isEditorialImageGenerationEnabled,
} from "@/lib/news/ai/generate-editorial-image";
export type {
  EditorialImageMetadata,
  ResolveEditorialImageResult,
  ProcessEditorialImageQueueResult,
} from "@/lib/news/ai/generate-editorial-image";
