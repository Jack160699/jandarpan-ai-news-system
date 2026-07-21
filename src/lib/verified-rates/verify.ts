import "server-only";

import { seriesKeyFrom } from "@/lib/verified-rates/catalog";
import { evaluateConsensus, type ConsensusCandidate } from "@/lib/verified-rates/consensus";
import { effectiveDateIst } from "@/lib/verified-rates/dates";
import { isProviderKilled, recordProviderAttempt } from "@/lib/verified-rates/health";
import { fuelUlipProvider } from "@/lib/verified-rates/providers/fuel-ulip";
import { fuelIoclLicensedProvider } from "@/lib/verified-rates/providers/fuel-iocl-licensed";
import { bullionIbjaProvider } from "@/lib/verified-rates/providers/bullion-ibja";
import { bullionLicensedSecondaryProvider } from "@/lib/verified-rates/providers/bullion-licensed-secondary";
import { bullionLicensedTertiaryProvider } from "@/lib/verified-rates/providers/bullion-licensed-tertiary";
import type { ProviderFetchResult, RateProvider } from "@/lib/verified-rates/providers/types";
import {
  persistAcceptedDailySnapshot,
  recordBlockedVerificationRun,
} from "@/lib/verified-rates/repository";
import type { RateCategory } from "@/lib/verified-rates/types";
import { verifiedRatesDb } from "@/lib/verified-rates/db";

const PROVIDERS: RateProvider[] = [
  fuelUlipProvider,
  fuelIoclLicensedProvider,
  bullionIbjaProvider,
  bullionLicensedSecondaryProvider,
  bullionLicensedTertiaryProvider,
];

function resultCode(r: ProviderFetchResult | undefined): string {
  if (!r) return "unavailable";
  if (r.status === "ok") return "ok";
  return r.code;
}

export async function runVerification(opts: {
  category: RateCategory;
  citySlug?: string | null;
  signal?: AbortSignal;
}): Promise<{
  status:
    | "accepted"
    | "blocked"
    | "unavailable"
    | "conflict"
    | "error"
    | "insufficient_sources";
  code?: string;
  snapshotOk?: boolean;
  observationCount?: number;
  participatingFamilies?: number;
  runId?: string | null;
}> {
  const series = seriesKeyFrom({ category: opts.category, citySlug: opts.citySlug });
  if (!series) return { status: "error", code: "unsupported_combination" };

  const providers = PROVIDERS.filter((p) => p.supports(opts.category));
  if (!providers.length) {
    const runId = await recordBlockedVerificationRun({
      category: opts.category,
      citySlug: opts.citySlug,
      geoScope: series.geoScope,
      unit: series.unit,
      purity: series.purity,
      taxBasis: series.taxBasis,
      errorCode: "no_provider",
      effectiveDate: effectiveDateIst(),
    });
    return { status: "blocked", code: "no_provider", runId };
  }

  const results: ProviderFetchResult[] = [];
  for (const p of providers) {
    if (await isProviderKilled(p.id)) {
      results.push({ status: "blocked", code: "circuit_or_kill_switch", series });
      continue;
    }
    const r = await p.fetch({
      category: opts.category,
      citySlug: opts.citySlug,
      signal: opts.signal,
    });
    results.push(r);
    await recordProviderAttempt({
      sourceId: p.id,
      ok: r.status === "ok",
      errorCode: r.status === "ok" ? undefined : resultCode(r),
    });
  }

  const ok = results.filter(
    (r): r is Extract<ProviderFetchResult, { status: "ok" }> => r.status === "ok"
  );

  if (ok.length === 0) {
    const blocked = results.find((r) => r.status === "blocked");
    const code = resultCode(blocked ?? results[0]);
    const runId = await recordBlockedVerificationRun({
      category: opts.category,
      citySlug: opts.citySlug,
      geoScope: series.geoScope,
      unit: series.unit,
      purity: series.purity,
      taxBasis: series.taxBasis,
      errorCode: code,
      effectiveDate: effectiveDateIst(),
      status: blocked ? "blocked" : "unavailable",
    });
    return {
      status: blocked ? "blocked" : "unavailable",
      code,
      runId,
      observationCount: 0,
      participatingFamilies: 0,
    };
  }

  const candidates: ConsensusCandidate[] = ok.map((r) => ({
    sourceId: r.sourceId,
    sourceFamily: r.sourceFamily,
    priceNumeric: r.priceNumeric,
    unit: series.unit,
    purity: series.purity,
    taxBasis: series.taxBasis,
    sourceReportedAt: r.sourceReportedAt,
    sessionLabel: r.sessionLabel,
    derived: false,
  }));

  const consensus = evaluateConsensus(opts.category, candidates);
  const db = verifiedRatesDb();

  // Always persist a verification run + raw observations (evidence), even if consensus fails.
  let runId: string | null = null;
  try {
    const runStatus =
      consensus.status === "accepted"
        ? "accepted"
        : consensus.status === "conflict"
          ? "conflict"
          : consensus.status === "insufficient_sources"
            ? "unavailable"
            : "unavailable";

    const { data } = await db
      .from("verified_rate_verification_runs")
      .insert({
        category: opts.category,
        geo_scope: series.geoScope,
        city_slug: series.citySlug,
        state_code: series.stateCode,
        country_code: series.countryCode,
        purity: series.purity,
        unit: series.unit,
        tax_basis: series.taxBasis,
        status: runStatus,
        consensus_method:
          consensus.status === "accepted" ? consensus.consensusMethod : null,
        source_count: ok.length,
        participating_families: consensus.participatingFamilies,
        price_numeric: consensus.status === "accepted" ? consensus.priceNumeric : null,
        currency: "INR",
        spread: consensus.status === "accepted" ? consensus.spread : consensus.spread,
        source_reported_at: ok[0]!.sourceReportedAt,
        generated_at: new Date().toISOString(),
        effective_date: effectiveDateIst(
          ok[0]!.sourceReportedAt ? new Date(ok[0]!.sourceReportedAt) : new Date()
        ),
        session_label: ok[0]!.sessionLabel,
        error_code: consensus.status === "accepted" ? null : consensus.reason,
        redacted_notes:
          consensus.status === "accepted"
            ? null
            : "Observations retained; consensus not published",
      })
      .select("id")
      .single();
    runId = (data?.id as string | undefined) ?? null;

    if (runId) {
      await db.from("verified_rate_observations").insert(
        ok.map((r) => ({
          run_id: runId,
          source_id: r.sourceId,
          price_numeric: r.priceNumeric,
          currency: "INR",
          unit: series.unit,
          purity: series.purity,
          tax_basis: series.taxBasis,
          source_reported_at: r.sourceReportedAt,
        }))
      );
    }
  } catch {
    /* continue */
  }

  if (consensus.status !== "accepted") {
    return {
      status:
        consensus.status === "conflict"
          ? "conflict"
          : consensus.status === "insufficient_sources"
            ? "insufficient_sources"
            : "unavailable",
      code: consensus.reason,
      observationCount: ok.length,
      participatingFamilies: consensus.participatingFamilies,
      runId,
      snapshotOk: false,
    };
  }

  const snap = await persistAcceptedDailySnapshot({
    series,
    priceNumeric: consensus.priceNumeric,
    currency: "INR",
    sourceCount: consensus.sourceCount,
    participatingFamilies: consensus.participatingFamilies,
    consensusMethod: consensus.consensusMethod,
    spread: consensus.spread,
    confidence: "0.9000",
    sourceReportedAt: ok[0]!.sourceReportedAt,
    generatedAt: new Date().toISOString(),
    validUntil: ok[0]!.validUntil,
    anomalyStatus: "none",
    sessionLabel: ok[0]!.sessionLabel,
    acceptedRunId: runId,
  });

  return {
    status: "accepted",
    snapshotOk: snap.ok,
    code: snap.ok ? undefined : snap.reason,
    observationCount: ok.length,
    participatingFamilies: consensus.participatingFamilies,
    runId,
  };
}

export function providerEligibilitySummary() {
  return {
    fuel: {
      providers: ["fuel_ulip_hpcl", "fuel_iocl_licensed"],
      enabled: process.env.VERIFIED_RATES_FUEL_ENABLED === "1",
      credentialsPresent: Boolean(
        process.env.ULIP_API_KEY?.trim() && process.env.ULIP_CLIENT_ID?.trim()
      ),
      secondFamilyCredentialsPresent: Boolean(process.env.IOCL_RATES_API_KEY?.trim()),
      live: false,
      minIndependentFamilies: 2,
      note: "Requires ULIP + second independent OMC/licensed family; single-source never publishes",
    },
    bullion: {
      providers: ["bullion_ibja", "bullion_secondary", "bullion_tertiary"],
      enabled: process.env.VERIFIED_RATES_BULLION_ENABLED === "1",
      credentialsPresent: Boolean(process.env.IBJA_ACCESS_TOKEN?.trim()),
      displayConsent: process.env.IBJA_DISPLAY_CONSENT === "1",
      live: false,
      minIndependentFamilies: 3,
      note: "Requires IBJA token + written display consent + two additional independent eligible families",
    },
  };
}
