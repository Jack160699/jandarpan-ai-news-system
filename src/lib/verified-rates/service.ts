import "server-only";

import { getCategoryMeta } from "@/lib/verified-rates/catalog";
import { buildHistoryResponse, getRelatedSupportedLocations } from "@/lib/verified-rates/history";
import {
  fetchAcceptedSnapshots,
  getHistoryDiagnostics,
  getLatestVerifiedRate,
} from "@/lib/verified-rates/repository";
import type { HistoryRange, RateCategory } from "@/lib/verified-rates/types";
import { providerEligibilitySummary } from "@/lib/verified-rates/verify";

export async function getRateHistory(opts: {
  category: RateCategory;
  citySlug?: string | null;
  range: HistoryRange;
  language?: "hi" | "en";
}) {
  const snapshots = await fetchAcceptedSnapshots({
    category: opts.category,
    citySlug: opts.citySlug,
    limit: 400,
  });

  const eligibility = providerEligibilitySummary();
  const meta = getCategoryMeta(opts.category);
  const blocked =
    meta.group === "fuel"
      ? !eligibility.fuel.live
      : !eligibility.bullion.live;

  return buildHistoryResponse({
    category: opts.category,
    citySlug: opts.citySlug,
    range: opts.range,
    snapshots,
    language: opts.language,
    currentStatus: snapshots.length === 0 && blocked ? "blocked" : undefined,
  });
}

export async function getLatestRate(opts: {
  category: RateCategory;
  citySlug?: string | null;
}) {
  return getLatestVerifiedRate(opts);
}

export async function getAvailableHistoryRanges(opts: {
  category: RateCategory;
  citySlug?: string | null;
}) {
  const result = await getRateHistory({ ...opts, range: "MAX" });
  if ("error" in result) return [];
  return result.availableRanges;
}

export async function getDatasetMetadata(opts: {
  category: RateCategory;
  citySlug?: string | null;
}) {
  const diag = await getHistoryDiagnostics(opts);
  const meta = getCategoryMeta(opts.category);
  return {
    category: opts.category,
    labelHi: meta.labelHi,
    unit: meta.unit,
    purity: meta.purity,
    updateFrequencyHi: meta.group === "fuel" ? "दैनिक सत्यापन (जब स्रोत उपलब्ध)" : "कार्यदिवस पर सत्रानुसार",
    geographicCoverageHi:
      meta.group === "fuel" ? "रायपुर, दुर्ग, भिलाई" : "भारत/छत्तीसगढ़ संकेतात्मक बेंचमार्क",
    ...diag,
    citationSuggestionHi:
      "जन दर्पण सत्यापित दर श्रृंखला — स्रोत संख्या और प्रभावी तिथि सहित उद्धृत करें।",
    correctionPath: "/contact",
  };
}

export { getRelatedSupportedLocations };
