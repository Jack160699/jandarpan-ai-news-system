/**
 * A1 homepage utility contract — weather + optional market rate tiles.
 * Provider details stay out of UI; never invent numeric rates or temps.
 */

import type { DistrictWeatherSnapshot } from "@/lib/weather/types";

export type A1RateId = "gold" | "silver" | "diesel" | "petrol" | "usd" | "sensex" | "nifty" | "mandi";

export type A1UtilityStatus = "ok" | "unavailable" | "stale" | "omitted";

export type A1RateTile = {
  id: A1RateId;
  labelHi: string;
  labelEn: string;
  /** Display value including currency symbol when applicable — only when status=ok */
  value: string | null;
  unit?: string | null;
  /** Optional change label — only when honestly sourced; never fabricate % */
  changeLabelHi?: string | null;
  changeLabelEn?: string | null;
  locationOrMarket?: string | null;
  source: string;
  fetchedAt: string | null;
  status: A1UtilityStatus;
  stale: boolean;
};

export type A1UtilitiesSnapshot = {
  weather: DistrictWeatherSnapshot | null;
  rates: A1RateTile[];
  /** True when at least one rate tile has status=ok */
  hasHonestRates: boolean;
};

/** Build A1 rates list — empty until a real provider is wired (no cg-rates jitter). */
export function buildHonestA1Rates(tiles: A1RateTile[] = []): A1RateTile[] {
  return tiles.filter((t) => t.status === "ok" && Boolean(t.value?.trim()));
}

export function buildA1UtilitiesSnapshot(input: {
  weather?: DistrictWeatherSnapshot | null;
  rates?: A1RateTile[];
}): A1UtilitiesSnapshot {
  const rates = buildHonestA1Rates(input.rates ?? []);
  return {
    weather: input.weather ?? null,
    rates,
    hasHonestRates: rates.length > 0,
  };
}
