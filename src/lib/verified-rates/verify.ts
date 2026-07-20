import "server-only";

import { seriesKeyFrom } from "@/lib/verified-rates/catalog";
import { effectiveDateIst } from "@/lib/verified-rates/dates";
import { fuelUlipProvider } from "@/lib/verified-rates/providers/fuel-ulip";
import { bullionIbjaProvider } from "@/lib/verified-rates/providers/bullion-ibja";
import type { ProviderFetchResult, RateProvider } from "@/lib/verified-rates/providers/types";
import {
  persistAcceptedDailySnapshot,
  recordBlockedVerificationRun,
} from "@/lib/verified-rates/repository";
import type { RateCategory } from "@/lib/verified-rates/types";
import { verifiedRatesDb } from "@/lib/verified-rates/db";

const PROVIDERS: RateProvider[] = [fuelUlipProvider, bullionIbjaProvider];

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
  status: "accepted" | "blocked" | "unavailable" | "conflict" | "error";
  code?: string;
  snapshotOk?: boolean;
}> {
  const series = seriesKeyFrom({ category: opts.category, citySlug: opts.citySlug });
  if (!series) return { status: "error", code: "unsupported_combination" };

  const providers = PROVIDERS.filter((p) => p.supports(opts.category));
  if (!providers.length) {
    await recordBlockedVerificationRun({
      category: opts.category,
      citySlug: opts.citySlug,
      geoScope: series.geoScope,
      unit: series.unit,
      purity: series.purity,
      taxBasis: series.taxBasis,
      errorCode: "no_provider",
      effectiveDate: effectiveDateIst(),
    });
    return { status: "blocked", code: "no_provider" };
  }

  const results = await Promise.all(
    providers.map((p) =>
      p.fetch({ category: opts.category, citySlug: opts.citySlug, signal: opts.signal })
    )
  );

  const ok = results.filter((r): r is Extract<ProviderFetchResult, { status: "ok" }> => r.status === "ok");
  if (ok.length === 0) {
    const blocked = results.find((r) => r.status === "blocked");
    const code = resultCode(blocked ?? results[0]);
    await recordBlockedVerificationRun({
      category: opts.category,
      citySlug: opts.citySlug,
      geoScope: series.geoScope,
      unit: series.unit,
      purity: series.purity,
      taxBasis: series.taxBasis,
      errorCode: code,
      effectiveDate: effectiveDateIst(),
    });
    return {
      status: blocked ? "blocked" : "unavailable",
      code,
    };
  }

  if (ok.length >= 2) {
    const prices = new Set(ok.map((r) => r.priceNumeric));
    if (prices.size > 1) {
      try {
        const supabase = verifiedRatesDb();
        await supabase.from("verified_rate_verification_runs").insert({
          category: opts.category,
          geo_scope: series.geoScope,
          city_slug: series.citySlug,
          state_code: series.stateCode,
          country_code: series.countryCode,
          purity: series.purity,
          unit: series.unit,
          tax_basis: series.taxBasis,
          status: "conflict",
          source_count: ok.length,
          participating_families: new Set(ok.map((r) => r.sourceFamily)).size,
          effective_date: effectiveDateIst(),
          generated_at: new Date().toISOString(),
          error_code: "price_spread",
          redacted_notes: "Compatible sources disagreed — no consensus published",
        });
      } catch {
        /* ignore */
      }
      return { status: "conflict", code: "price_spread" };
    }
  }

  const winner = ok[0]!;

  let runId: string | null = null;
  try {
    const supabase = verifiedRatesDb();
    const { data } = await supabase
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
        status: "accepted",
        consensus_method: ok.length >= 2 ? "unanimous_compatible" : "single_eligible_source",
        source_count: ok.length,
        participating_families: new Set(ok.map((r) => r.sourceFamily)).size,
        price_numeric: winner.priceNumeric,
        currency: "INR",
        source_reported_at: winner.sourceReportedAt,
        generated_at: new Date().toISOString(),
        effective_date: effectiveDateIst(
          winner.sourceReportedAt ? new Date(winner.sourceReportedAt) : new Date()
        ),
        session_label: winner.sessionLabel,
      })
      .select("id")
      .single();
    runId = (data?.id as string | undefined) ?? null;

    if (runId) {
      await supabase.from("verified_rate_observations").insert({
        run_id: runId,
        source_id: winner.sourceId,
        price_numeric: winner.priceNumeric,
        currency: "INR",
        unit: series.unit,
        purity: series.purity,
        tax_basis: series.taxBasis,
        source_reported_at: winner.sourceReportedAt,
      });
    }
  } catch {
    // continue to snapshot attempt if run insert failed partially
  }

  const snap = await persistAcceptedDailySnapshot({
    series,
    priceNumeric: winner.priceNumeric,
    currency: "INR",
    sourceCount: ok.length,
    participatingFamilies: 1,
    consensusMethod: ok.length >= 2 ? "unanimous_compatible" : "single_eligible_source",
    spread: null,
    confidence: ok.length >= 2 ? "0.9000" : "0.7000",
    sourceReportedAt: winner.sourceReportedAt,
    generatedAt: new Date().toISOString(),
    validUntil: winner.validUntil,
    anomalyStatus: "none",
    sessionLabel: winner.sessionLabel,
    acceptedRunId: runId,
  });

  return {
    status: "accepted",
    snapshotOk: snap.ok,
    code: snap.ok ? undefined : snap.reason,
  };
}

export function providerEligibilitySummary() {
  return {
    fuel: {
      provider: "HPCL via ULIP",
      enabled: process.env.VERIFIED_RATES_FUEL_ENABLED === "1",
      credentialsPresent: Boolean(
        process.env.ULIP_API_KEY?.trim() && process.env.ULIP_CLIENT_ID?.trim()
      ),
      live: false,
      note: "Adapter gated; live ULIP call pending licensed wiring",
    },
    bullion: {
      provider: "IBJA Rates API",
      enabled: process.env.VERIFIED_RATES_BULLION_ENABLED === "1",
      credentialsPresent: Boolean(process.env.IBJA_ACCESS_TOKEN?.trim()),
      displayConsent: process.env.IBJA_DISPLAY_CONSENT === "1",
      live: Boolean(
        process.env.VERIFIED_RATES_BULLION_ENABLED === "1" &&
          process.env.IBJA_ACCESS_TOKEN?.trim() &&
          process.env.IBJA_DISPLAY_CONSENT === "1"
      ),
      note: "Requires paid token + written republication consent",
    },
    group: {
      fuelUnit: "litre",
      bullionGoldUnit: "10g",
      bullionSilverUnit: "kg",
    },
  };
}
