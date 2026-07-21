import {
  comparePrices,
  diffPrices,
  maxPrice,
  minPrice,
  percentChange,
  roundForPresentation,
} from "@/lib/verified-rates/decimal";
import { addDaysYmd, diffDaysYmd } from "@/lib/verified-rates/dates";
import type {
  HistoryRange,
  RateMovement,
  RateRangeStatistics,
  VerifiedHistoryPoint,
} from "@/lib/verified-rates/types";

export const RANGE_DAY_BUDGET: Record<Exclude<HistoryRange, "MAX">, number> = {
  "7D": 7,
  "30D": 30,
  "90D": 90,
  "1Y": 365,
};

function signedRound(value: string, decimals: number): string | null {
  const negative = value.startsWith("-");
  const abs = negative ? value.slice(1) : value;
  if (abs === "0" || abs === "0.0" || /^0\.0+$/.test(abs)) return "0";
  // Temporary positive format via presentation helper; allow zero path separately.
  const parts = abs.split(".");
  const whole = parts[0] ?? "0";
  const frac = parts[1] ?? "";
  if (!/^\d+$/.test(whole) || (frac && !/^\d+$/.test(frac))) return null;
  if (decimals === 0) {
    const bump = Number(frac[0] ?? "0") >= 5 ? 1 : 0;
    const n = (BigInt(whole) + BigInt(bump)).toString();
    return negative && n !== "0" ? `-${n}` : n;
  }
  const padded = (frac + "0".repeat(decimals + 1)).slice(0, decimals + 1);
  let keep = BigInt(padded.slice(0, decimals) || "0");
  if (Number(padded[decimals] ?? "0") >= 5) keep += BigInt(1);
  const base = BigInt(10) ** BigInt(decimals);
  let w = BigInt(whole);
  if (keep >= base) {
    w += BigInt(1);
    keep -= base;
  }
  const body = `${w.toString()}.${keep.toString().padStart(decimals, "0")}`;
  return negative && body !== `${"0".padStart(1, "0")}.${"0".repeat(decimals)}`
    ? `-${body}`
    : body;
}

export function computeMovement(
  pointsChronological: VerifiedHistoryPoint[],
  presentationDecimals: number
): RateMovement {
  if (pointsChronological.length < 2) {
    return {
      status: "insufficient_history",
      absolute: null,
      percentage: null,
      previousDate: null,
      previousPrice: null,
    };
  }
  const latest = pointsChronological[pointsChronological.length - 1]!;
  const previous = pointsChronological[pointsChronological.length - 2]!;
  const cmp = comparePrices(latest.price, previous.price);
  if (cmp === null) {
    return {
      status: "insufficient_history",
      absolute: null,
      percentage: null,
      previousDate: null,
      previousPrice: null,
    };
  }
  const absoluteRaw = diffPrices(latest.price, previous.price);
  const pctRaw = percentChange(latest.price, previous.price);

  return {
    status: cmp > 0 ? "up" : cmp < 0 ? "down" : "unchanged",
    absolute: absoluteRaw === null ? null : signedRound(absoluteRaw, presentationDecimals),
    percentage: pctRaw === null ? null : signedRound(pctRaw, 2),
    previousDate: previous.date,
    previousPrice: roundForPresentation(previous.price, presentationDecimals),
  };
}

export function computeRangeStatistics(
  pointsChronological: VerifiedHistoryPoint[],
  presentationDecimals: number
): RateRangeStatistics {
  if (pointsChronological.length === 0) {
    return {
      high: null,
      low: null,
      observationCount: 0,
      missingDayCount: 0,
      periodAbsoluteChange: null,
      periodPercentageChange: null,
      latestVerifiedDate: null,
    };
  }

  const prices = pointsChronological.map((p) => p.price);
  const highRaw = maxPrice(prices);
  const lowRaw = minPrice(prices);
  const first = pointsChronological[0]!;
  const last = pointsChronological[pointsChronological.length - 1]!;
  const span = diffDaysYmd(last.date, first.date);
  const calendarDays = span === null ? pointsChronological.length : span + 1;
  const missingDayCount = Math.max(0, calendarDays - pointsChronological.length);

  let periodAbsoluteChange: string | null = null;
  let periodPercentageChange: string | null = null;
  if (pointsChronological.length >= 2) {
    const abs = diffPrices(last.price, first.price);
    const pct = percentChange(last.price, first.price);
    periodAbsoluteChange = abs === null ? null : signedRound(abs, presentationDecimals);
    periodPercentageChange = pct === null ? null : signedRound(pct, 2);
  }

  return {
    high: highRaw ? roundForPresentation(highRaw, presentationDecimals) : null,
    low: lowRaw ? roundForPresentation(lowRaw, presentationDecimals) : null,
    observationCount: pointsChronological.length,
    missingDayCount,
    periodAbsoluteChange,
    periodPercentageChange,
    latestVerifiedDate: last.date,
  };
}

/** Meaningful ranges only — never enable a control that implies fabricated span. */
export function availableRangesFromPoints(
  pointsChronological: VerifiedHistoryPoint[]
): HistoryRange[] {
  if (pointsChronological.length === 0) return [];
  if (pointsChronological.length === 1) return ["MAX"];

  const first = pointsChronological[0]!.date;
  const last = pointsChronological[pointsChronological.length - 1]!.date;
  const span = diffDaysYmd(last, first) ?? 0;
  const ranges: HistoryRange[] = [];
  if (span >= 1) ranges.push("7D");
  if (span >= 7) ranges.push("30D");
  if (span >= 29) ranges.push("90D");
  if (span >= 89) ranges.push("1Y");
  ranges.push("MAX");
  return ranges;
}

/**
 * Filter points into a requested window without inventing missing days.
 */
export function filterPointsForRange(
  pointsChronological: VerifiedHistoryPoint[],
  range: HistoryRange,
  asOfDate: string
): VerifiedHistoryPoint[] {
  if (pointsChronological.length === 0) return [];
  if (range === "MAX") return [...pointsChronological];
  const budget = RANGE_DAY_BUDGET[range];
  const windowStart = addDaysYmd(asOfDate, -(budget - 1)) ?? asOfDate;
  return pointsChronological.filter((p) => p.date >= windowStart && p.date <= asOfDate);
}

export function dedupeOnePointPerDay(
  points: VerifiedHistoryPoint[]
): VerifiedHistoryPoint[] {
  const byDate = new Map<string, VerifiedHistoryPoint>();
  for (const p of points) {
    const existing = byDate.get(p.date);
    if (!existing || existing.verifiedAt <= p.verifiedAt) {
      byDate.set(p.date, p);
    }
  }
  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}

export function arePointsCompatible(
  a: { unit: string; purity: string | null; taxBasis: string },
  b: { unit: string; purity: string | null; taxBasis: string }
): boolean {
  return a.unit === b.unit && a.purity === b.purity && a.taxBasis === b.taxBasis;
}
