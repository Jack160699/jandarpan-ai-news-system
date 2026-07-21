import "server-only";

import { getCategoryMeta } from "@/lib/verified-rates/catalog";
import { fetchAcceptedSnapshots } from "@/lib/verified-rates/repository";
import { roundForPresentation, isPositivePriceString } from "@/lib/verified-rates/decimal";
import type { RateCategory } from "@/lib/verified-rates/types";

export async function buildVerifiedRatesCsv(opts: {
  category: RateCategory;
  citySlug?: string | null;
}): Promise<{ ok: true; csv: string } | { ok: false; reason: string }> {
  const snapshots = await fetchAcceptedSnapshots({
    category: opts.category,
    citySlug: opts.citySlug,
    limit: 400,
  });
  if (snapshots.length < 7) {
    return { ok: false, reason: "insufficient_history" };
  }

  const meta = getCategoryMeta(opts.category);
  const header = [
    "category",
    "geography",
    "city",
    "state",
    "effective_date",
    "price",
    "currency",
    "unit",
    "purity",
    "verification_timestamp",
    "source_count",
    "status",
  ].join(",");

  const lines = [header];
  for (const s of snapshots) {
    if (!isPositivePriceString(s.priceNumeric)) continue;
    const price = roundForPresentation(s.priceNumeric, meta.presentationDecimals);
    if (!price) continue;
    lines.push(
      [
        s.category,
        s.geoScope,
        s.citySlug ?? "",
        s.stateCode,
        s.effectiveDate,
        price,
        s.currency,
        s.unit,
        s.purity ?? "",
        s.sourceReportedAt ?? s.generatedAt,
        String(s.sourceCount),
        s.status,
      ]
        .map(csvEscape)
        .join(",")
    );
  }

  if (lines.length < 8) {
    return { ok: false, reason: "insufficient_history" };
  }

  return { ok: true, csv: lines.join("\n") + "\n" };
}

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}
