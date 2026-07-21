import { localizeCommodity } from "./commodities";
import { classifyMandiFreshness, parseMandiReportedDate } from "./freshness";
import { MANDI_SOURCE, type MandiRate } from "./types";

export type RawMandiRecord = Record<string, unknown>;

function pickString(row: RawMandiRecord, keys: string[]): string | null {
  for (const k of keys) {
    const v = row[k];
    if (typeof v === "string" && v.trim()) return v.trim();
    if (typeof v === "number" && Number.isFinite(v)) return String(v);
  }
  return null;
}

/** Safe numeric parse — rejects NaN / empty / non-numeric junk. */
export function parsePrice(raw: unknown): number | null {
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  if (typeof raw !== "string") return null;
  const cleaned = raw.replace(/,/g, "").trim();
  if (!cleaned) return null;
  if (!/^-?\d+(\.\d+)?$/.test(cleaned)) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

export function normalizeMandiRecord(
  row: RawMandiRecord,
  fetchedAt: string,
  unitHi = "₹/क्विंटल",
  unitEn = "₹/quintal"
): MandiRate | null {
  const state = pickString(row, ["state", "State"]);
  const district = pickString(row, ["district", "District"]);
  const market = pickString(row, ["market", "Market"]);
  const providerCommodity = pickString(row, ["commodity", "Commodity"]);
  const variety = pickString(row, ["variety", "Variety"]);
  const reportedAt = pickString(row, ["arrival_date", "Arrival_Date", "arrivalDate"]);
  const modalPrice = parsePrice(
    row.modal_price ?? row["Modal Price"] ?? row.modalPrice ?? row.Modal_Price
  );
  const minPrice = parsePrice(
    row.min_price ?? row["Min Price"] ?? row.minPrice ?? row.Min_Price
  );
  const maxPrice = parsePrice(
    row.max_price ?? row["Max Price"] ?? row.maxPrice ?? row.Max_Price
  );

  if (!state || !district || !market || !providerCommodity || !reportedAt) return null;
  if (modalPrice == null || modalPrice < 0) return null;

  const freshness = classifyMandiFreshness(reportedAt);
  if (freshness === "stale" || freshness === "invalid") return null;

  const labels = localizeCommodity(providerCommodity);
  return {
    commodity: labels.hi,
    providerCommodity,
    variety,
    market,
    district,
    state,
    minPrice,
    maxPrice,
    modalPrice,
    unit: unitHi,
    unitEn,
    reportedAt,
    fetchedAt,
    source: MANDI_SOURCE,
    freshness,
  };
}

export function dedupeMandiRates(rates: MandiRate[]): MandiRate[] {
  const map = new Map<string, MandiRate>();
  for (const r of rates) {
    const key = [
      r.providerCommodity,
      r.variety ?? "",
      r.market,
      r.district,
      r.reportedAt,
    ].join("\u0001");
    const prev = map.get(key);
    if (!prev) {
      map.set(key, r);
      continue;
    }
    // Prefer row with both min and max present
    const prevScore = (prev.minPrice != null ? 1 : 0) + (prev.maxPrice != null ? 1 : 0);
    const nextScore = (r.minPrice != null ? 1 : 0) + (r.maxPrice != null ? 1 : 0);
    if (nextScore > prevScore) map.set(key, r);
  }
  return [...map.values()];
}

/** Pick latest reported date per preferred commodity; keep distinct markets/varieties. */
export function selectHomepageRates(rates: MandiRate[], limit = 5): MandiRate[] {
  const byCommodity = new Map<string, MandiRate[]>();
  for (const r of rates) {
    const list = byCommodity.get(r.providerCommodity) ?? [];
    list.push(r);
    byCommodity.set(r.providerCommodity, list);
  }
  const picked: MandiRate[] = [];
  const byDate = (a: MandiRate, b: MandiRate) => {
    const da = parseMandiReportedDate(a.reportedAt)?.getTime() ?? 0;
    const db = parseMandiReportedDate(b.reportedAt)?.getTime() ?? 0;
    if (db !== da) return db - da;
    return b.modalPrice - a.modalPrice;
  };
  for (const list of byCommodity.values()) {
    list.sort(byDate);
    // Latest date only for this commodity; if multiple markets same day, keep one market (no average)
    const latestDate = list[0]?.reportedAt;
    const sameDay = list.filter((x) => x.reportedAt === latestDate);
    picked.push(sameDay[0]!);
  }
  picked.sort(byDate);
  return picked.slice(0, limit);
}
