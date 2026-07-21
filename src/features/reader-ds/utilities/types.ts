/** Honest mandi rate contracts — AGMARKNET via data.gov.in */

export const MANDI_SOURCE = "AGMARKNET / data.gov.in" as const;
export const MANDI_RESOURCE_ID = "9ef84268-d588-465a-a308-a864a43d0070" as const;
export const MANDI_API_HOST = "https://api.data.gov.in" as const;

/** Server fetch cache (seconds). */
export const MANDI_REVALIDATE_SEC = 2700; // 45 minutes
/** Accept records reported within this many calendar days (IST). */
export const MANDI_MAX_AGE_DAYS = 3;

export type MandiUnavailableReason =
  | "missing_api_key"
  | "provider_error"
  | "no_current_records"
  | "stale_records"
  | "invalid_schema";

export type MandiRate = {
  commodity: string;
  providerCommodity: string;
  variety: string | null;
  market: string;
  district: string;
  state: string;
  minPrice: number | null;
  maxPrice: number | null;
  modalPrice: number;
  unit: string;
  unitEn: string;
  reportedAt: string;
  fetchedAt: string;
  source: typeof MANDI_SOURCE;
  freshness: "current" | "recent";
};

export type MandiProviderResult =
  | {
      status: "available";
      location: string;
      rates: MandiRate[];
      reportedAt: string;
      fetchedAt: string;
      source: typeof MANDI_SOURCE;
      freshness: "current" | "recent";
    }
  | {
      status: "unavailable";
      reason: MandiUnavailableReason;
      rates: [];
      fetchedAt: string;
      source: typeof MANDI_SOURCE;
      location?: string;
    };

export type MandiApiJson = {
  status: "available" | "unavailable";
  location?: string;
  reportedAt?: string;
  fetchedAt: string;
  freshness?: "current" | "recent";
  reason?: MandiUnavailableReason;
  source: { name: typeof MANDI_SOURCE };
  rates: Array<{
    commodity: string;
    providerCommodity: string;
    variety: string | null;
    market: string;
    district: string;
    state: string;
    modalPrice: number;
    minPrice: number | null;
    maxPrice: number | null;
    unit: string;
    reportedAt: string;
    freshness: "current" | "recent";
  }>;
};
