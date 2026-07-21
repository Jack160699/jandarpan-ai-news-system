import "server-only";

import { seriesKeyFrom } from "@/lib/verified-rates/catalog";
import type { RateProvider } from "@/lib/verified-rates/providers/types";
import type { RateCategory } from "@/lib/verified-rates/types";
import { isPositivePriceString } from "@/lib/verified-rates/decimal";

const ALLOWED_HOSTS = new Set([
  "www.ulip.nic.in",
  "ulip.nic.in",
  "api.ulip.nic.in",
]);

/**
 * HPCL-via-ULIP adapter — gated.
 * Without ULIP credentials + explicit enable flag, returns blocked.
 * Does not scrape OMC HTML or third-party fuel sites.
 */
export const fuelUlipProvider: RateProvider = {
  id: "fuel_ulip_hpcl",
  family: "omc_ulip",
  supports: (category: RateCategory) => category === "petrol" || category === "diesel",
  async fetch(input) {
    const series = seriesKeyFrom({ category: input.category, citySlug: input.citySlug });
    if (!series) {
      return {
        status: "error",
        code: "unsupported_combination",
        series: {
          category: input.category,
          geoScope: "city",
          citySlug: input.citySlug ?? null,
          stateCode: "CG",
          countryCode: "IN",
          purity: null,
          unit: "litre",
          taxBasis: "retail_rsp_indicative",
        },
      };
    }

    const enabled = process.env.VERIFIED_RATES_FUEL_ENABLED === "1";
    const apiKey = process.env.ULIP_API_KEY?.trim();
    const clientId = process.env.ULIP_CLIENT_ID?.trim();
    if (!enabled || !apiKey || !clientId) {
      return {
        status: "blocked",
        code: apiKey && clientId ? "fuel_not_enabled" : "ulip_credentials_missing",
        series,
      };
    }

    const endpoint =
      process.env.ULIP_FUEL_RATES_URL?.trim() ||
      "https://www.ulip.nic.in/api/fuel/rates";

    let url: URL;
    try {
      url = new URL(endpoint);
    } catch {
      return { status: "error", code: "ulip_bad_endpoint", series };
    }
    if (!ALLOWED_HOSTS.has(url.hostname)) {
      return { status: "error", code: "ulip_host_not_allowlisted", series };
    }

    // Live ULIP contract wiring — until response schema is certified, stay unavailable
    // rather than inventing prices. Retries are bounded.
    for (let attempt = 0; attempt < 2; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 12_000);
      const signal = input.signal ?? controller.signal;
      try {
        const res = await fetch(url.toString(), {
          method: "GET",
          signal,
          headers: {
            Accept: "application/json",
            "x-api-key": apiKey,
            "x-client-id": clientId,
          },
          redirect: "error",
          cache: "no-store",
        });
        clearTimeout(timer);
        if (!res.ok) {
          if (attempt === 0 && res.status >= 500) continue;
          return { status: "unavailable", code: `ulip_http_${res.status}`, series };
        }
        const payload = (await res.json()) as Record<string, unknown>;
        const priceRaw = String(
          payload.price ?? payload.rsp ?? payload.retailPrice ?? ""
        );
        if (!isPositivePriceString(priceRaw)) {
          return { status: "unavailable", code: "ulip_invalid_or_missing_price", series };
        }
        return {
          status: "ok",
          series,
          priceNumeric: priceRaw,
          currency: "INR",
          sourceId: "fuel_ulip_hpcl",
          sourceFamily: "omc_ulip",
          sourceReportedAt:
            typeof payload.asOn === "string"
              ? payload.asOn
              : typeof payload.timestamp === "string"
                ? payload.timestamp
                : null,
          sessionLabel: "day",
          validUntil: null,
        };
      } catch {
        clearTimeout(timer);
        if (attempt === 0) continue;
        return { status: "error", code: "ulip_fetch_failed", series };
      }
    }

    return { status: "unavailable", code: "ulip_adapter_exhausted", series };
  },
};
