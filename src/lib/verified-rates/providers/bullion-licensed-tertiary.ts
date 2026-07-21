import "server-only";

import { seriesKeyFrom } from "@/lib/verified-rates/catalog";
import type { RateProvider } from "@/lib/verified-rates/providers/types";
import type { RateCategory } from "@/lib/verified-rates/types";

const BULLION: RateCategory[] = ["gold_24k", "gold_22k", "silver_999"];

/**
 * Third independent bullion family — blocked until a licensed feed + display rights exist.
 * Does not scrape jeweller / aggregator HTML.
 */
export const bullionLicensedTertiaryProvider: RateProvider = {
  id: "bullion_tertiary",
  family: "bullion_licensed_c",
  supports: (category: RateCategory) => BULLION.includes(category),
  async fetch(input) {
    const series = seriesKeyFrom({ category: input.category, citySlug: null });
    if (!series) {
      return {
        status: "error",
        code: "unsupported_combination",
        series: {
          category: input.category,
          geoScope: "state",
          citySlug: null,
          stateCode: "CG",
          countryCode: "IN",
          purity: null,
          unit: "10g",
          taxBasis: "ex_gst_benchmark",
        },
      };
    }

    const enabled = process.env.VERIFIED_RATES_BULLION_TERTIARY_ENABLED === "1";
    const hasCreds = Boolean(process.env.BULLION_TERTIARY_API_KEY?.trim());
    if (!enabled || !hasCreds) {
      return {
        status: "blocked",
        code: hasCreds ? "bullion_tertiary_not_enabled" : "bullion_tertiary_credentials_missing",
        series,
      };
    }

    return {
      status: "unavailable",
      code: "bullion_tertiary_adapter_not_live",
      series,
    };
  },
};
