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
  type SignalPersistResult,
} from "@/lib/newsroom/signals/persist";
export {
  publishToLegacyArticles,
  isLegacyBridgeEnabled,
  type LegacyPublishResult,
} from "@/lib/newsroom/bridge/legacy-publish";
export { clusterRecentSignals } from "@/lib/newsroom/events/cluster";
export {
  publishGeneratedFromEvents,
  isGeneratedArticlesHomepageEnabled,
} from "@/lib/newsroom/generated/publish";
