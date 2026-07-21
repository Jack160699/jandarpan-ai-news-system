/** District intelligence — storage keys, defaults, inventory thresholds */

export const DEFAULT_DISTRICT_SLUG = "raipur" as const;

/** How the active district was chosen (audit + override rules) */
export type DistrictResolutionSource =
  | "explicit"
  | "profile"
  | "local"
  | "geo"
  | "default_raipur";

/** Browser location permission outcome (never re-prompt after deny) */
export type LocationPermissionState =
  | "unknown"
  | "prompted"
  | "granted"
  | "denied"
  | "unavailable"
  | "timeout"
  | "inaccurate";

export const DISTRICT_SOURCE_KEY = "jd-district-source-v1";
export const LOCATION_PERMISSION_KEY = "jd-loc-permission-v1";
/** Coarse derived slug only — never store precise lat/lng */
export const GEO_DERIVED_DISTRICT_KEY = "jd-geo-district-v1";

/** Minimum exact-district stories before nearby fallback fills the rail */
export const MERA_JILA_MIN_EXACT = 3;
/** Cap nearby stories injected after exact inventory */
export const MERA_JILA_NEARBY_FILL = 4;
/** Max distance (km) for "आसपास" neighbors */
export const NEARBY_MAX_KM = 120;
/** Max neighbors considered for fallback */
export const NEARBY_MAX_COUNT = 4;
/** Reject geo matches farther than this from any district HQ */
export const GEO_MAX_MATCH_KM = 80;
