/** Verified rates — shared contracts (server-safe). */

export const RATE_CATEGORIES = [
  "petrol",
  "diesel",
  "gold_24k",
  "gold_22k",
  "silver_999",
] as const;

export type RateCategory = (typeof RATE_CATEGORIES)[number];

export const HISTORY_RANGES = ["7D", "30D", "90D", "1Y", "MAX"] as const;
export type HistoryRange = (typeof HISTORY_RANGES)[number];

export const FUEL_CITY_SLUGS = ["raipur", "durg", "bhilai"] as const;
export type FuelCitySlug = (typeof FUEL_CITY_SLUGS)[number];

export type GeoScope = "city" | "state" | "country";
export type MovementStatus = "up" | "down" | "unchanged" | "insufficient_history";
export type CurrentRateStatus =
  | "available"
  | "unavailable"
  | "conflict"
  | "stale"
  | "blocked"
  | "insufficient_history";

export type VerifiedHistoryPoint = {
  date: string;
  price: string;
  verifiedAt: string;
  sourceCount: number;
};

export type RateMovement = {
  status: MovementStatus;
  absolute: string | null;
  percentage: string | null;
  previousDate: string | null;
  previousPrice: string | null;
};

export type RateRangeStatistics = {
  high: string | null;
  low: string | null;
  observationCount: number;
  missingDayCount: number;
  periodAbsoluteChange: string | null;
  periodPercentageChange: string | null;
  latestVerifiedDate: string | null;
};

export type RateLocation = {
  geoScope: GeoScope;
  citySlug: string | null;
  cityNameHi: string | null;
  cityNameEn: string | null;
  stateCode: string;
  stateNameHi: string;
  stateNameEn: string;
  countryCode: string;
  honestyLabelHi: string;
  honestyLabelEn: string;
};

export type VerifiedRateSeriesKey = {
  category: RateCategory;
  geoScope: GeoScope;
  citySlug: string | null;
  stateCode: string;
  countryCode: string;
  purity: string | null;
  unit: string;
  taxBasis: string;
};

export type DailySnapshotRecord = VerifiedRateSeriesKey & {
  id: string;
  priceNumeric: string;
  currency: string;
  sourceCount: number;
  participatingFamilies: number;
  consensusMethod: string;
  spread: string | null;
  confidence: string | null;
  sourceReportedAt: string | null;
  generatedAt: string;
  effectiveDate: string;
  validUntil: string | null;
  status: "accepted" | "superseded";
  anomalyStatus: "none" | "flagged" | "rejected";
  sessionLabel: string | null;
  acceptedRunId: string | null;
  recordKey: string;
};

export type HistoryApiResponse = {
  status: CurrentRateStatus;
  category: RateCategory;
  location: {
    city: string | null;
    state: string;
    geoScope: GeoScope;
    honestyLabel: string;
  };
  currency: string;
  unit: string;
  purity: string | null;
  taxBasis: string;
  range: HistoryRange;
  availableFrom: string | null;
  availableTo: string | null;
  current: {
    price: string | null;
    effectiveDate: string | null;
    verifiedAt: string | null;
    sourceCount: number | null;
    status: CurrentRateStatus;
  };
  points: VerifiedHistoryPoint[];
  movement: RateMovement;
  statistics: RateRangeStatistics;
  availableRanges: HistoryRange[];
  graphEligible: boolean;
  disclaimerHi: string;
  methodologyPath: string;
};
