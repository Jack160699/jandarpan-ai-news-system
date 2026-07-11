export { isDistrictV3Enabled } from "./config";
export { DistrictV3Page } from "./DistrictV3Page";
export { DistrictExperienceV3 } from "./DistrictExperienceV3";

export {
  DistrictHome,
  DistrictHero,
  DistrictStats,
  DistrictSelector,
  FavoriteDistricts,
  GovernmentUpdates,
  WeatherWidget,
  TrafficWidget,
  JobsWidget,
  EventsWidget,
  CrimeUpdates,
  BusinessUpdates,
  TrendingStories,
  DistrictTimeline,
  DistrictCard,
  Responsive,
  Loading,
} from "./components";

export {
  DistrictV3Skeleton,
  DistrictCardSkeleton,
  DistrictHeroSkeleton,
} from "./skeletons";

export { useDistrictV3Data } from "./hooks/useDistrictV3Data";
export { getDistrictV3Placeholder } from "./data/placeholders";
export { DISTRICT_V3_SELECTOR_DISTRICTS, DISTRICT_V3_MAX_FAVORITES } from "./constants";

export type {
  DistrictExperienceV3Props,
  DistrictInfo,
  DistrictV3Data,
  DistrictListItem,
  DistrictWeather,
  DistrictStat,
  DistrictTimelineEvent,
} from "./types";
