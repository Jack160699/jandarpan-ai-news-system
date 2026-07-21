/**
 * CG daily rates — RETIRED inventing helper.
 * Do not call from public UI. Prefer verified-rates consensus snapshots.
 */

export type RateDirection = "up" | "down" | "flat";

export type CgDailyRate = {
  id: "gold" | "silver" | "usd" | "petrol";
  labelEn: string;
  labelHi: string;
  value: string;
  changePct: number;
  direction: RateDirection;
};

export type CgRatesSnapshot = {
  updatedAt: string;
  rates: CgDailyRate[];
  status?: "unavailable";
};

/** Permanently unavailable — never invents jittered prices. */
export function buildCgDailyRates(): CgRatesSnapshot {
  return {
    updatedAt: new Date().toISOString(),
    rates: [],
    status: "unavailable",
  };
}

export function getCachedCgDailyRates(): CgRatesSnapshot {
  return buildCgDailyRates();
}

export const CG_RATES_REVALIDATE_SEC = 6 * 60 * 60;
