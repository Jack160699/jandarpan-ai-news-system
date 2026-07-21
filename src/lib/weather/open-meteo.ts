/**
 * Open-Meteo district forecast — no API key required.
 * https://open-meteo.com/en/docs
 */

import { getDistrict, type CgDistrict } from "@/lib/regional/districts";
import {
  WEATHER_MAX_AGE_MS,
  WEATHER_REVALIDATE_SEC,
  WEATHER_SOURCE,
  type DistrictWeatherSnapshot,
  type WeatherFetchStatus,
} from "./types";
import { conditionEnFromCode, conditionHiFromCode } from "./codes";

export type OpenMeteoCurrentPayload = {
  current?: {
    temperature_2m?: number;
    weather_code?: number;
    is_day?: number;
    time?: string;
  };
};

export { conditionEnFromCode, conditionHiFromCode, weatherIconName } from "./codes";

function unavailable(
  district: CgDistrict,
  status: WeatherFetchStatus,
  message?: string
): DistrictWeatherSnapshot {
  return {
    status,
    districtSlug: district.slug,
    locationEn: district.name,
    locationHi: district.nameHi,
    tempC: null,
    conditionHi: null,
    conditionEn: null,
    isDay: null,
    weatherCode: null,
    source: WEATHER_SOURCE,
    fetchedAt: null,
    stale: false,
    errorSafeMessage: message,
  };
}

export function resolveWeatherDistrict(slug: string | null | undefined): CgDistrict {
  const requested = slug?.trim() ? getDistrict(slug.trim()) : undefined;
  return requested ?? getDistrict("raipur")!;
}

export function parseOpenMeteoPayload(
  district: CgDistrict,
  data: OpenMeteoCurrentPayload,
  fetchedAt = new Date().toISOString()
): DistrictWeatherSnapshot {
  const temp = data.current?.temperature_2m;
  const code = data.current?.weather_code;
  if (typeof temp !== "number" || !Number.isFinite(temp)) {
    return unavailable(district, "invalid", "Missing temperature");
  }
  const weatherCode = typeof code === "number" && Number.isFinite(code) ? code : 0;
  return {
    status: "ok",
    districtSlug: district.slug,
    locationEn: district.name,
    locationHi: district.nameHi,
    tempC: Math.round(temp),
    conditionHi: conditionHiFromCode(weatherCode),
    conditionEn: conditionEnFromCode(weatherCode),
    isDay: data.current?.is_day === 1,
    weatherCode,
    source: WEATHER_SOURCE,
    fetchedAt,
    stale: false,
  };
}

export function isWeatherStale(fetchedAt: string | null, now = Date.now()): boolean {
  if (!fetchedAt) return true;
  const t = Date.parse(fetchedAt);
  if (!Number.isFinite(t)) return true;
  return now - t > WEATHER_MAX_AGE_MS;
}

export function markStaleIfNeeded(
  snapshot: DistrictWeatherSnapshot,
  now = Date.now()
): DistrictWeatherSnapshot {
  if (snapshot.status !== "ok") return snapshot;
  const stale = isWeatherStale(snapshot.fetchedAt, now);
  return stale ? { ...snapshot, stale: true, status: "unavailable", tempC: null } : snapshot;
}

type FetchDistrictWeatherOptions = {
  districtSlug?: string | null;
  /** Abort / timeout signal */
  signal?: AbortSignal;
  /** Override fetch (tests) */
  fetchImpl?: typeof fetch;
  /** Override revalidate for Next fetch cache */
  revalidateSec?: number;
};

/**
 * Server-side (or Node) Open-Meteo fetch. Never invents values.
 * Returns status ≠ ok on failure — callers must not display fake temps.
 */
export async function fetchDistrictWeather(
  options: FetchDistrictWeatherOptions = {}
): Promise<DistrictWeatherSnapshot> {
  const district = resolveWeatherDistrict(options.districtSlug);
  if (district.lat == null || district.lng == null) {
    return unavailable(district, "unavailable", "District coordinates missing");
  }

  const fetchImpl = options.fetchImpl ?? fetch;
  const revalidate = options.revalidateSec ?? WEATHER_REVALIDATE_SEC;
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${district.lat}` +
    `&longitude=${district.lng}` +
    `&current=temperature_2m,weather_code,is_day&timezone=Asia%2FKolkata`;

  try {
    const res = await fetchImpl(url, {
      signal: options.signal,
      next: { revalidate },
    } as RequestInit & { next?: { revalidate: number } });

    if (!res.ok) {
      return unavailable(district, "unavailable", `Upstream HTTP ${res.status}`);
    }
    const data = (await res.json()) as OpenMeteoCurrentPayload;
    return parseOpenMeteoPayload(district, data);
  } catch (err) {
    const name = err instanceof Error ? err.name : "";
    if (name === "AbortError" || name === "TimeoutError") {
      return unavailable(district, "timeout", "Request timed out");
    }
    return unavailable(district, "error", "Weather fetch failed");
  }
}

/** JSON shape returned by `/api/weather` (backward compatible + contract fields). */
export function toWeatherApiJson(snapshot: DistrictWeatherSnapshot) {
  if (snapshot.status !== "ok" || snapshot.tempC == null) {
    return {
      ok: false as const,
      status: snapshot.status,
      district: snapshot.districtSlug,
      source: snapshot.source,
      stale: snapshot.stale,
    };
  }
  return {
    ok: true as const,
    status: snapshot.status,
    district: snapshot.districtSlug,
    locationEn: snapshot.locationEn,
    locationHi: snapshot.locationHi,
    tempC: snapshot.tempC,
    conditionHi: snapshot.conditionHi,
    conditionEn: snapshot.conditionEn,
    isDay: snapshot.isDay,
    weatherCode: snapshot.weatherCode,
    source: snapshot.source,
    fetchedAt: snapshot.fetchedAt,
    stale: snapshot.stale,
  };
}
