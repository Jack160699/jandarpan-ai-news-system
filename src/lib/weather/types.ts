/**
 * District weather — provider-agnostic contract for Reader DS + legacy chrome.
 */

export type WeatherFetchStatus = "ok" | "unavailable" | "invalid" | "timeout" | "error";

export type DistrictWeatherSnapshot = {
  status: WeatherFetchStatus;
  districtSlug: string;
  locationEn: string;
  locationHi: string;
  tempC: number | null;
  conditionHi: string | null;
  conditionEn: string | null;
  isDay: boolean | null;
  /** Open-Meteo WMO weather code when known */
  weatherCode: number | null;
  source: "open-meteo";
  fetchedAt: string | null;
  /** True when older than WEATHER_MAX_AGE_MS (client cache only). */
  stale: boolean;
  errorSafeMessage?: string;
};

export const WEATHER_SOURCE = "open-meteo" as const;
/** Server + client max freshness for weather (30 minutes). */
export const WEATHER_MAX_AGE_MS = 30 * 60 * 1000;
export const WEATHER_REVALIDATE_SEC = 1800;
