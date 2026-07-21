import { comparePrices, diffPrices, isPositivePriceString, percentChange } from "@/lib/verified-rates/decimal";
import type { RateCategory } from "@/lib/verified-rates/types";
import { getCategoryMeta } from "@/lib/verified-rates/catalog";

export type ConsensusCandidate = {
  sourceId: string;
  sourceFamily: string;
  priceNumeric: string;
  unit: string;
  purity: string | null;
  taxBasis: string;
  sourceReportedAt: string | null;
  sessionLabel: string | null;
  derived?: boolean;
};

export type ConsensusResult =
  | {
      status: "accepted";
      priceNumeric: string;
      sourceCount: number;
      participatingFamilies: number;
      spread: string;
      consensusMethod: string;
      families: string[];
    }
  | {
      status: "insufficient_sources" | "conflict" | "incompatible";
      reason: string;
      sourceCount: number;
      participatingFamilies: number;
      spread: string | null;
    };

const FUEL_MAX_ABS_SPREAD = "0.20";
const GOLD_MAX_PCT = "0.75";
const SILVER_MAX_PCT = "1.0";

/** Independent non-derived families required before publishing verified consensus. */
export function requiredIndependentFamilies(category: RateCategory): number {
  const group = getCategoryMeta(category).group;
  return group === "fuel" ? 2 : 3;
}

export function evaluateConsensus(
  category: RateCategory,
  candidates: ConsensusCandidate[]
): ConsensusResult {
  const independent = candidates.filter((c) => !c.derived && isPositivePriceString(c.priceNumeric));
  if (independent.length === 0) {
    return {
      status: "insufficient_sources",
      reason: "no_valid_observations",
      sourceCount: 0,
      participatingFamilies: 0,
      spread: null,
    };
  }

  const unit = independent[0]!.unit;
  const purity = independent[0]!.purity;
  const tax = independent[0]!.taxBasis;
  for (const c of independent) {
    if (c.unit !== unit || c.purity !== purity || c.taxBasis !== tax) {
      return {
        status: "incompatible",
        reason: "mismatched_unit_purity_or_tax_basis",
        sourceCount: independent.length,
        participatingFamilies: new Set(independent.map((x) => x.sourceFamily)).size,
        spread: null,
      };
    }
  }

  const families = [...new Set(independent.map((c) => c.sourceFamily))];
  const required = requiredIndependentFamilies(category);
  if (families.length < required) {
    return {
      status: "insufficient_sources",
      reason: `need_${required}_independent_families_have_${families.length}`,
      sourceCount: independent.length,
      participatingFamilies: families.length,
      spread: null,
    };
  }

  // One representative price per family (latest reported).
  const byFamily = new Map<string, ConsensusCandidate>();
  for (const c of independent) {
    const prev = byFamily.get(c.sourceFamily);
    if (!prev || (c.sourceReportedAt ?? "") >= (prev.sourceReportedAt ?? "")) {
      byFamily.set(c.sourceFamily, c);
    }
  }
  const reps = [...byFamily.values()];
  const prices = reps.map((r) => r.priceNumeric);
  const sorted = [...prices].sort((a, b) => (comparePrices(a, b) ?? 0));
  const low = sorted[0]!;
  const high = sorted[sorted.length - 1]!;
  const absSpread = diffPrices(high, low);
  if (absSpread === null) {
    return {
      status: "conflict",
      reason: "spread_uncomputable",
      sourceCount: independent.length,
      participatingFamilies: families.length,
      spread: null,
    };
  }

  const meta = getCategoryMeta(category);
  if (meta.group === "fuel") {
    const spreadAbs = absSpread.startsWith("-") ? absSpread.slice(1) : absSpread;
    const over = comparePrices(spreadAbs, FUEL_MAX_ABS_SPREAD);
    if (over !== null && over > 0) {
      return {
        status: "conflict",
        reason: "fuel_spread_exceeds_0_20",
        sourceCount: independent.length,
        participatingFamilies: families.length,
        spread: spreadAbs,
      };
    }
  } else {
    const pct = percentChange(high, low);
    if (pct === null) {
      return {
        status: "conflict",
        reason: "pct_spread_uncomputable",
        sourceCount: independent.length,
        participatingFamilies: families.length,
        spread: absSpread,
      };
    }
    const limit = category === "silver_999" ? SILVER_MAX_PCT : GOLD_MAX_PCT;
    const pctAbs = pct.startsWith("-") ? pct.slice(1) : pct;
    const over = comparePrices(pctAbs, limit);
    if (over !== null && over > 0) {
      return {
        status: "conflict",
        reason: category === "silver_999" ? "silver_spread_exceeds_1pct" : "gold_spread_exceeds_0_75pct",
        sourceCount: independent.length,
        participatingFamilies: families.length,
        spread: pctAbs,
      };
    }
  }

  // Median of family representatives (for even count, lower middle — conservative).
  const mid = Math.floor((sorted.length - 1) / 2);
  const median = sorted[mid]!;
  const spreadAbs = absSpread.startsWith("-") ? absSpread.slice(1) : absSpread;

  return {
    status: "accepted",
    priceNumeric: median,
    sourceCount: independent.length,
    participatingFamilies: families.length,
    spread: spreadAbs,
    consensusMethod: "independent_family_median",
    families,
  };
}
