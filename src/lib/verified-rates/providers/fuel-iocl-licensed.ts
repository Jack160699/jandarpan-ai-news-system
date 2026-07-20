import "server-only";

import { seriesKeyFrom } from "@/lib/verified-rates/catalog";
import type { RateProvider } from "@/lib/verified-rates/providers/types";
import type { RateCategory } from "@/lib/verified-rates/types";

/**
 * Second independent fuel family placeholder — IOCL licensed feed.
 * Remains blocked until a commercial programmatic feed + display rights exist.
 * Does not scrape iocl.com HTML/SMS.
 */
export const fuelIoclLicensedProvider: RateProvider = {
  id: "fuel_iocl_licensed",
  family: "omc_iocl_licensed",
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

    const enabled = process.env.VERIFIED_RATES_FUEL_IOCL_ENABLED === "1";
    const hasCreds = Boolean(process.env.IOCL_RATES_API_KEY?.trim());
    if (!enabled || !hasCreds) {
      return {
        status: "blocked",
        code: hasCreds ? "iocl_not_enabled" : "iocl_credentials_missing",
        series,
      };
    }

    return {
      status: "unavailable",
      code: "iocl_adapter_not_live",
      series,
    };
  },
};
