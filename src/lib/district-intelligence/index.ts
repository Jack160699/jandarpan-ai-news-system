export {
  DEFAULT_DISTRICT_SLUG,
  DISTRICT_SOURCE_KEY,
  GEO_DERIVED_DISTRICT_KEY,
  LOCATION_PERMISSION_KEY,
  MERA_JILA_MIN_EXACT,
  MERA_JILA_NEARBY_FILL,
  NEARBY_MAX_COUNT,
  NEARBY_MAX_KM,
  GEO_MAX_MATCH_KM,
  type DistrictResolutionSource,
  type LocationPermissionState,
} from "./constants";

export {
  resolveDistrictPreference,
  resolveServerDistrict,
  type DistrictResolution,
  type DistrictResolutionInput,
} from "./resolve";

export {
  districtFromCoordinates,
  getNearbyDistricts,
  haversineKm,
  isNearbyDistrict,
  type DistrictDistance,
  type LatLng,
} from "./geo";

export {
  isManualDistrictLocked,
  readDistrictSource,
  readGeoDerivedDistrict,
  readLocationPermission,
  requestDistrictFromBrowserLocation,
  shouldAskForLocation,
  writeDistrictSource,
  writeGeoDerivedDistrict,
  writeLocationPermission,
  type LocateResult,
} from "./location";

export {
  articleMatchesDistrict,
  articleMatchesNearby,
  isStatewideHomeArticle,
  resolveArticleDistrictSlug,
} from "./match";

export {
  DISTRICT_LEAD_PRIORITY_ORDER,
  rankDistrictStories,
  scoreDistrictLeadCandidate,
  type DistrictLeadReason,
  type RankDistrictStoriesResult,
  type ScoredDistrictArticle,
} from "./lead-ranking";

export {
  composeMeraJila,
  type MeraJilaComposition,
  type MeraJilaItem,
  type MeraJilaItemKind,
} from "./mera-jila";

export {
  classifyForChhattisgarhSection,
  scoreStateSectionCandidate,
  type StateClassifyInput,
  type StateSectionClassification,
  type StateSectionReason,
} from "./state-section";

export {
  composeDistrictDashboard,
  type DashboardModule,
  type DashboardModuleId,
  type DashboardModuleStatus,
  type DistrictDashboard,
  type DistrictDashboardInput,
} from "./dashboard";
