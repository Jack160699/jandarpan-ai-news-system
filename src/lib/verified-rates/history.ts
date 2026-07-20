import { getCategoryMeta, seriesKeyFrom, buildLocation } from "@/lib/verified-rates/catalog";
import { effectiveDateIst } from "@/lib/verified-rates/dates";
import { roundForPresentation, isPositivePriceString } from "@/lib/verified-rates/decimal";
import {
  availableRangesFromPoints,
  computeMovement,
  computeRangeStatistics,
  dedupeOnePointPerDay,
  filterPointsForRange,
} from "@/lib/verified-rates/movement";
import type {
  CurrentRateStatus,
  DailySnapshotRecord,
  HistoryApiResponse,
  HistoryRange,
  RateCategory,
  VerifiedHistoryPoint,
} from "@/lib/verified-rates/types";
import { HISTORY_RANGES } from "@/lib/verified-rates/types";

export function isHistoryRange(value: string): value is HistoryRange {
  return (HISTORY_RANGES as readonly string[]).includes(value);
}

export function snapshotsToPoints(
  snapshots: DailySnapshotRecord[]
): VerifiedHistoryPoint[] {
  const raw: VerifiedHistoryPoint[] = [];
  for (const s of snapshots) {
    if (s.status !== "accepted") continue;
    if (!isPositivePriceString(s.priceNumeric)) continue;
    raw.push({
      date: s.effectiveDate,
      price: s.priceNumeric,
      verifiedAt: s.sourceReportedAt ?? s.generatedAt,
      sourceCount: s.sourceCount,
    });
  }
  return dedupeOnePointPerDay(raw);
}

export function buildHistoryResponse(input: {
  category: RateCategory;
  citySlug?: string | null;
  range: HistoryRange;
  snapshots: DailySnapshotRecord[];
  currentStatus?: CurrentRateStatus;
  language?: "hi" | "en";
}): HistoryApiResponse | { error: "unsupported_combination" | "invalid_range" } {
  const series = seriesKeyFrom({ category: input.category, citySlug: input.citySlug });
  const location = buildLocation({ category: input.category, citySlug: input.citySlug });
  if (!series || !location) return { error: "unsupported_combination" };
  if (!isHistoryRange(input.range)) return { error: "invalid_range" };

  const meta = getCategoryMeta(input.category);
  const lang = input.language ?? "hi";
  const allPoints = snapshotsToPoints(
    input.snapshots.filter(
      (s) =>
        s.category === series.category &&
        s.geoScope === series.geoScope &&
        (s.citySlug ?? null) === (series.citySlug ?? null) &&
        s.unit === series.unit &&
        (s.purity ?? null) === (series.purity ?? null) &&
        s.taxBasis === series.taxBasis &&
        s.status === "accepted"
    )
  );

  const asOf =
    allPoints.length > 0
      ? allPoints[allPoints.length - 1]!.date
      : effectiveDateIst();
  const points = filterPointsForRange(allPoints, input.range, asOf).map((p) => ({
    ...p,
    price: roundForPresentation(p.price, meta.presentationDecimals) ?? p.price,
  }));

  // Reject any non-positive after presentation
  const safePoints = points.filter((p) => isPositivePriceString(p.price));

  const availableRanges = availableRangesFromPoints(allPoints);
  const movement = computeMovement(safePoints, meta.presentationDecimals);
  const statistics = computeRangeStatistics(safePoints, meta.presentationDecimals);
  const graphEligible = safePoints.length >= 2;

  const latest = allPoints.length > 0 ? allPoints[allPoints.length - 1]! : null;
  const today = effectiveDateIst();
  let currentStatus: CurrentRateStatus =
    input.currentStatus ?? (latest ? "available" : "unavailable");

  // Never present a prior day as "today" — if latest is older than today, mark stale/unavailable for current
  let currentPrice: string | null = null;
  let currentDate: string | null = null;
  let currentVerifiedAt: string | null = null;
  let currentSourceCount: number | null = null;

  if (latest) {
    currentDate = latest.date;
    currentVerifiedAt = latest.verifiedAt;
    currentSourceCount = latest.sourceCount;
    currentPrice = roundForPresentation(latest.price, meta.presentationDecimals);
    if (latest.date < today && !input.currentStatus) {
      currentStatus = "stale";
    }
  } else if (!input.currentStatus) {
    currentStatus = "unavailable";
  }

  if (allPoints.length === 0) {
    currentStatus = input.currentStatus === "blocked" ? "blocked" : "unavailable";
  } else if (allPoints.length === 1 && currentStatus === "available") {
    // history insufficient for graph but current may still be available
  }

  return {
    status: currentStatus,
    category: input.category,
    location: {
      city: lang === "hi" ? location.cityNameHi : location.cityNameEn,
      state: lang === "hi" ? location.stateNameHi : location.stateNameEn,
      geoScope: location.geoScope,
      honestyLabel: lang === "hi" ? location.honestyLabelHi : location.honestyLabelEn,
    },
    currency: "INR",
    unit: meta.unit,
    purity: meta.purity,
    taxBasis: meta.taxBasis,
    range: input.range,
    availableFrom: allPoints[0]?.date ?? null,
    availableTo: latest?.date ?? null,
    current: {
      price: currentPrice,
      effectiveDate: currentDate,
      verifiedAt: currentVerifiedAt,
      sourceCount: currentSourceCount,
      status: currentStatus,
    },
    points: safePoints,
    movement,
    statistics,
    availableRanges,
    graphEligible,
    disclaimerHi:
      meta.group === "fuel"
        ? "दरें संकेतात्मक हैं; पंप पर लगी कीमत अंतिम प्रमाण है। जन दर्पण सत्यापित स्रोतों के बिना दर नहीं बनाता।"
        : "बुलियन दर संकेतात्मक बेंचमार्क है (GST/मेकिंग चार्ज अलग)। शहर-विशेष आधिकारिक ज्वेलरी MRP नहीं।",
    methodologyPath: "/rates/methodology",
  };
}

export function getRelatedSupportedLocations(category: RateCategory): Array<{
  path: string;
  labelHi: string;
  labelEn: string;
}> {
  const meta = getCategoryMeta(category);
  if (meta.group === "fuel") {
    const other = category === "petrol" ? "diesel" : "petrol";
    const otherMeta = getCategoryMeta(other);
    return [
      {
        path: `/rates/chhattisgarh/raipur/${meta.slug}`,
        labelHi: `रायपुर ${meta.labelHi}`,
        labelEn: `Raipur ${meta.labelEn}`,
      },
      {
        path: `/rates/chhattisgarh/durg/${meta.slug}`,
        labelHi: `दुर्ग ${meta.labelHi}`,
        labelEn: `Durg ${meta.labelEn}`,
      },
      {
        path: `/rates/chhattisgarh/bhilai/${meta.slug}`,
        labelHi: `भिलाई ${meta.labelHi}`,
        labelEn: `Bhilai ${meta.labelEn}`,
      },
      {
        path: `/rates/chhattisgarh/raipur/${otherMeta.slug}`,
        labelHi: `रायपुर ${otherMeta.labelHi}`,
        labelEn: `Raipur ${otherMeta.labelEn}`,
      },
    ];
  }
  return [
    {
      path: "/rates/chhattisgarh/gold-price-today",
      labelHi: "छत्तीसगढ़ सोना 24K",
      labelEn: "Chhattisgarh Gold 24K",
    },
    {
      path: "/rates/chhattisgarh/gold-22k-price-today",
      labelHi: "छत्तीसगढ़ सोना 22K",
      labelEn: "Chhattisgarh Gold 22K",
    },
    {
      path: "/rates/chhattisgarh/silver-price-today",
      labelHi: "छत्तीसगढ़ चांदी",
      labelEn: "Chhattisgarh Silver",
    },
  ];
}
