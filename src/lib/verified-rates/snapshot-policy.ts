/**
 * Daily snapshot policy (Asia/Kolkata).
 *
 * FUEL: one accepted graph point per effective_date × city × category.
 * Latest accepted verification for that effective date wins; prior accepted
 * points for the same record_key are marked superseded (evidence retained via runs).
 *
 * BULLION: prefer latest verified closing/evening session; else latest verified
 * point for the reporting day. Session label stored when present.
 *
 * Never copy yesterday into today to fill gaps.
 */

import { buildRecordKey } from "@/lib/verified-rates/catalog";
import { effectiveDateIst } from "@/lib/verified-rates/dates";
import type { RateCategory, VerifiedRateSeriesKey } from "@/lib/verified-rates/types";
import { getCategoryMeta } from "@/lib/verified-rates/catalog";

export type IncomingVerifiedPoint = {
  series: VerifiedRateSeriesKey;
  priceNumeric: string;
  currency: string;
  sourceCount: number;
  participatingFamilies: number;
  consensusMethod: string;
  spread: string | null;
  confidence: string | null;
  sourceReportedAt: string | null;
  generatedAt: string;
  effectiveDate?: string;
  validUntil: string | null;
  anomalyStatus: "none" | "flagged" | "rejected";
  sessionLabel: string | null;
  acceptedRunId: string | null;
};

export function resolveEffectiveDate(point: IncomingVerifiedPoint): string {
  if (point.effectiveDate) return point.effectiveDate;
  if (point.sourceReportedAt) {
    return effectiveDateIst(new Date(point.sourceReportedAt));
  }
  return effectiveDateIst(new Date(point.generatedAt));
}

export function resolveSessionLabel(
  category: RateCategory,
  sessionLabel: string | null
): string {
  const meta = getCategoryMeta(category);
  if (meta.group === "fuel") return "day";
  // Bullion: normalize to day representative; keep AM/PM in metadata when provided
  if (sessionLabel === "PM" || sessionLabel === "closing" || sessionLabel === "evening") {
    return "closing";
  }
  if (sessionLabel === "AM" || sessionLabel === "opening") {
    return "opening";
  }
  return "day";
}

/**
 * Prefer closing over opening for bullion daily graph representative.
 * Fuel always uses "day".
 */
export function shouldAcceptAsDailyGraphPoint(
  category: RateCategory,
  sessionLabel: string | null,
  existingSession: string | null
): boolean {
  const meta = getCategoryMeta(category);
  if (meta.group === "fuel") return true;
  const incoming = resolveSessionLabel(category, sessionLabel);
  if (!existingSession) return true;
  if (existingSession === "closing") {
    return incoming === "closing";
  }
  // opening/day can be replaced by closing
  return true;
}

export function toSnapshotInsert(point: IncomingVerifiedPoint) {
  const effectiveDate = resolveEffectiveDate(point);
  const session = resolveSessionLabel(point.series.category, point.sessionLabel);
  const recordKey = buildRecordKey(point.series, effectiveDate, session);
  return {
    category: point.series.category,
    geo_scope: point.series.geoScope,
    city_slug: point.series.citySlug,
    state_code: point.series.stateCode,
    country_code: point.series.countryCode,
    purity: point.series.purity,
    unit: point.series.unit,
    tax_basis: point.series.taxBasis,
    price_numeric: point.priceNumeric,
    currency: point.currency,
    source_count: point.sourceCount,
    participating_families: point.participatingFamilies,
    consensus_method: point.consensusMethod,
    spread: point.spread,
    confidence: point.confidence,
    source_reported_at: point.sourceReportedAt,
    generated_at: point.generatedAt,
    effective_date: effectiveDate,
    valid_until: point.validUntil,
    status: "accepted" as const,
    anomaly_status: point.anomalyStatus,
    session_label: session,
    accepted_run_id: point.acceptedRunId,
    record_key: recordKey,
  };
}

export const SNAPSHOT_POLICY_SUMMARY_HI = `
ईंधन: प्रत्येक शहर और श्रेणी के लिए प्रभावी तिथि (एशिया/कोलकाता) पर एक स्वीकृत दैनिक बिंदु।
उस दिन के नवीनतम सत्यापित रन को ग्राफ़ बिंदु माना जाता है। कल की दर को आज में कॉपी नहीं किया जाता।

बुलियन: सभी सत्यापित इंट्राडे रन सुरक्षित रहते हैं; ग्राफ़ के लिए समापन/सायं बिंदु प्राथमिक,
अन्यथा उसी दिन का नवीनतम सत्यापित बिंदु। शुद्धता/इकाई/कर आधार मिलाकर तुलना नहीं।
`.trim();
