/**
 * CG daily rates — lightweight snapshot, refreshed ~4× per day (6h cache).
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
};

const CACHE_TTL_MS = 6 * 60 * 60 * 1000;

let memoryCache: { snapshot: CgRatesSnapshot; expires: number } | null = null;

function dirFromPct(pct: number): RateDirection {
  if (pct > 0.04) return "up";
  if (pct < -0.04) return "down";
  return "flat";
}

function jitter(scale = 0.25): number {
  return (Math.random() - 0.5) * scale;
}

/** Base CG desk rates — replace with upstream API when available */
export function buildCgDailyRates(): CgRatesSnapshot {
  const goldPct = 0.38 + jitter();
  const silverPct = -0.22 + jitter();
  const usdPct = -0.06 + jitter();
  const petrolPct = 0.11 + jitter();

  const goldBase = 98240 + Math.round(jitter(80) * 100);
  const silverBase = 1120 + Math.round(jitter(4) * 10);
  const usdBase = 83.21 + jitter(0.08);
  const petrolBase = 96.82 + jitter(0.12);

  return {
    updatedAt: new Date().toISOString(),
    rates: [
      {
        id: "gold",
        labelEn: "Gold (CG)",
        labelHi: "सोना (छत्तीसगढ़)",
        value: `₹${goldBase.toLocaleString("en-IN")}`,
        changePct: goldPct,
        direction: dirFromPct(goldPct),
      },
      {
        id: "silver",
        labelEn: "Silver (CG)",
        labelHi: "चाँदी (छत्तीसगढ़)",
        value: `₹${silverBase.toLocaleString("en-IN")}`,
        changePct: silverPct,
        direction: dirFromPct(silverPct),
      },
      {
        id: "usd",
        labelEn: "USD → INR",
        labelHi: "USD → INR",
        value: `₹${usdBase.toFixed(2)}`,
        changePct: usdPct,
        direction: dirFromPct(usdPct),
      },
      {
        id: "petrol",
        labelEn: "Petrol (Raipur)",
        labelHi: "पेट्रोल (रायपुर)",
        value: `₹${petrolBase.toFixed(2)}`,
        changePct: petrolPct,
        direction: dirFromPct(petrolPct),
      },
    ],
  };
}

export function getCachedCgDailyRates(): CgRatesSnapshot {
  const now = Date.now();
  if (memoryCache && memoryCache.expires > now) {
    return memoryCache.snapshot;
  }
  const snapshot = buildCgDailyRates();
  memoryCache = { snapshot, expires: now + CACHE_TTL_MS };
  return snapshot;
}

export const CG_RATES_REVALIDATE_SEC = 6 * 60 * 60;
