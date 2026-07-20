import "server-only";

import { seriesKeyFrom } from "@/lib/verified-rates/catalog";
import type { RateProvider } from "@/lib/verified-rates/providers/types";
import type { RateCategory } from "@/lib/verified-rates/types";

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
    const hasCreds = Boolean(
      process.env.ULIP_API_KEY?.trim() && process.env.ULIP_CLIENT_ID?.trim()
    );

    if (!enabled || !hasCreds) {
      return {
        status: "blocked",
        code: hasCreds ? "fuel_not_enabled" : "ulip_credentials_missing",
        series,
      };
    }

    // Licensed ULIP integration point — no synthetic fallback.
    // When credentials exist, a future implementation will call ULIP here.
    // Until the live contract is wired and validated, remain unavailable.
    return {
      status: "unavailable",
      code: "ulip_adapter_not_live",
      series,
    };
  },
};
