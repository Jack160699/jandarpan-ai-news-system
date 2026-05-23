export {
  CG_DISTRICTS,
  CG_STATE_SLUG,
  districtPriorityBoost,
  getAllDistrictSlugs,
  getDistrict,
  getPrioritizedDistricts,
  type CgDistrict,
  type DistrictPriorityTier,
} from "@/lib/regional/districts";

export {
  geoFromRecord,
  mergeGeoMetadata,
  matchDistrictsInText,
  tagGeoFromContent,
  type RegionalGeoMetadata,
} from "@/lib/regional/geo-tagging";

export {
  formatDistrictLabel,
  scoreRegionalTopic,
  scoreRegionalTopicFromArticle,
  type RegionalTopicScore,
} from "@/lib/regional/topic-scoring";

export { detectLocalTrends, type LocalTrendSignal } from "@/lib/regional/trends";

export {
  buildLocalBreakingAlerts,
  isLocalBreakingCandidate,
  type LocalBreakingAlert,
} from "@/lib/regional/breaking-alerts";

export {
  buildHyperlocalFeedBundle,
  filterRowsForDistrict,
  routeArticlesByDistrict,
  type HyperlocalFeedBlock,
  type HyperlocalFeedBundle,
} from "@/lib/regional/hyperlocal-feed";

export {
  buildRegionalRankingPersonalization,
  DEFAULT_REGIONAL_PREFS,
  parseRegionalPrefsFromQuery,
  type RegionalReaderPrefs,
} from "@/lib/regional/personalization";

export {
  buildRegionalRankingSnapshot,
  logLocalTrendSignals,
  logRegionalAnalytics,
} from "@/lib/regional/analytics";
