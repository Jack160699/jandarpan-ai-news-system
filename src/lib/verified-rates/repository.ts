import "server-only";

import type { DailySnapshotRecord, RateCategory } from "@/lib/verified-rates/types";
import type { IncomingVerifiedPoint } from "@/lib/verified-rates/snapshot-policy";
import {
  shouldAcceptAsDailyGraphPoint,
  toSnapshotInsert,
} from "@/lib/verified-rates/snapshot-policy";
import { isPositivePriceString } from "@/lib/verified-rates/decimal";
import { verifiedRatesDb } from "@/lib/verified-rates/db";

type SnapRow = {
  id: string;
  category: string;
  geo_scope: string;
  city_slug: string | null;
  state_code: string;
  country_code: string;
  purity: string | null;
  unit: string;
  tax_basis: string;
  price_numeric: string | number;
  currency: string;
  source_count: number;
  participating_families: number;
  consensus_method: string;
  spread: string | number | null;
  confidence: string | number | null;
  source_reported_at: string | null;
  generated_at: string;
  effective_date: string;
  valid_until: string | null;
  status: "accepted" | "superseded";
  anomaly_status: "none" | "flagged" | "rejected";
  session_label: string | null;
  accepted_run_id: string | null;
  record_key: string;
};

function mapRow(row: SnapRow): DailySnapshotRecord | null {
  const price = String(row.price_numeric);
  if (!isPositivePriceString(price)) return null;
  return {
    id: row.id,
    category: row.category as RateCategory,
    geoScope: row.geo_scope as DailySnapshotRecord["geoScope"],
    citySlug: row.city_slug,
    stateCode: row.state_code,
    countryCode: row.country_code,
    purity: row.purity,
    unit: row.unit,
    taxBasis: row.tax_basis,
    priceNumeric: price,
    currency: row.currency,
    sourceCount: row.source_count,
    participatingFamilies: row.participating_families,
    consensusMethod: row.consensus_method,
    spread: row.spread === null || row.spread === undefined ? null : String(row.spread),
    confidence:
      row.confidence === null || row.confidence === undefined ? null : String(row.confidence),
    sourceReportedAt: row.source_reported_at,
    generatedAt: row.generated_at,
    effectiveDate: row.effective_date,
    validUntil: row.valid_until,
    status: row.status,
    anomalyStatus: row.anomaly_status,
    sessionLabel: row.session_label,
    acceptedRunId: row.accepted_run_id,
    recordKey: row.record_key,
  };
}

export async function fetchAcceptedSnapshots(opts: {
  category: RateCategory;
  citySlug?: string | null;
  fromDate?: string;
  limit?: number;
}): Promise<DailySnapshotRecord[]> {
  try {
    const supabase = verifiedRatesDb();
    let q = supabase
      .from("verified_rate_daily_snapshots")
      .select("*")
      .eq("category", opts.category)
      .eq("status", "accepted")
      .order("effective_date", { ascending: true })
      .limit(opts.limit ?? 400);

    if (opts.citySlug) q = q.eq("city_slug", opts.citySlug);
    else q = q.is("city_slug", null);
    if (opts.fromDate) q = q.gte("effective_date", opts.fromDate);

    const { data, error } = await q;
    if (error || !data) return [];
    return (data as SnapRow[]).map(mapRow).filter((r): r is DailySnapshotRecord => r !== null);
  } catch {
    return [];
  }
}

export async function getLatestVerifiedRate(opts: {
  category: RateCategory;
  citySlug?: string | null;
}): Promise<DailySnapshotRecord | null> {
  const rows = await fetchAcceptedSnapshots({ ...opts, limit: 500 });
  return rows.length ? rows[rows.length - 1]! : null;
}

/**
 * Persist accepted consensus as a new immutable daily graph point.
 * Prior accepted row with the same record_key is superseded (status only).
 */
export async function persistAcceptedDailySnapshot(
  point: IncomingVerifiedPoint
): Promise<{ ok: boolean; reason?: string; recordKey?: string }> {
  if (!isPositivePriceString(point.priceNumeric)) {
    return { ok: false, reason: "invalid_price" };
  }
  const insert = toSnapshotInsert(point);

  try {
    const supabase = verifiedRatesDb();
    const { data: existing } = await supabase
      .from("verified_rate_daily_snapshots")
      .select("id, session_label, status")
      .eq("record_key", insert.record_key)
      .eq("status", "accepted")
      .maybeSingle();

    if (existing?.status === "accepted") {
      const allow = shouldAcceptAsDailyGraphPoint(
        point.series.category,
        point.sessionLabel,
        existing.session_label
      );
      if (!allow) {
        return { ok: false, reason: "session_not_preferred", recordKey: insert.record_key };
      }
      const { error: supErr } = await supabase
        .from("verified_rate_daily_snapshots")
        .update({ status: "superseded" })
        .eq("id", existing.id);
      if (supErr) return { ok: false, reason: supErr.message };
    }

    const { error } = await supabase.from("verified_rate_daily_snapshots").insert(insert);
    if (error) return { ok: false, reason: error.message };
    return { ok: true, recordKey: insert.record_key };
  } catch (e) {
    return { ok: false, reason: e instanceof Error ? e.message : "db_error" };
  }
}

export async function recordBlockedVerificationRun(opts: {
  category: RateCategory;
  citySlug?: string | null;
  geoScope: "city" | "state" | "country";
  unit: string;
  purity: string | null;
  taxBasis: string;
  errorCode: string;
  effectiveDate: string;
  status?: "blocked" | "unavailable" | "conflict" | "error";
}): Promise<string | null> {
  try {
    const supabase = verifiedRatesDb();
    const { data } = await supabase
      .from("verified_rate_verification_runs")
      .insert({
        category: opts.category,
        geo_scope: opts.geoScope,
        city_slug: opts.citySlug ?? null,
        state_code: "CG",
        country_code: "IN",
        purity: opts.purity,
        unit: opts.unit,
        tax_basis: opts.taxBasis,
        status: opts.status ?? "blocked",
        source_count: 0,
        participating_families: 0,
        effective_date: opts.effectiveDate,
        generated_at: new Date().toISOString(),
        error_code: opts.errorCode,
        redacted_notes: "No invented price; verification incomplete",
      })
      .select("id")
      .single();
    return (data?.id as string | undefined) ?? null;
  } catch {
    return null;
  }
}

export async function getHistoryDiagnostics(opts: {
  category: RateCategory;
  citySlug?: string | null;
}) {
  const snapshots = await fetchAcceptedSnapshots({ ...opts, limit: 500 });
  const first = snapshots[0] ?? null;
  const latest = snapshots.length ? snapshots[snapshots.length - 1]! : null;
  return {
    snapshotCount: snapshots.length,
    firstAvailableDate: first?.effectiveDate ?? null,
    latestAvailableDate: latest?.effectiveDate ?? null,
    graphEligible: snapshots.length >= 2,
    datasetExportEligible: snapshots.length >= 7,
  };
}
