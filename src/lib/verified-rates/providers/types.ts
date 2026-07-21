import type { RateCategory, VerifiedRateSeriesKey } from "@/lib/verified-rates/types";

export type ProviderFetchResult =
  | {
      status: "ok";
      series: VerifiedRateSeriesKey;
      priceNumeric: string;
      currency: "INR";
      sourceId: string;
      sourceFamily: string;
      sourceReportedAt: string | null;
      sessionLabel: string | null;
      validUntil: string | null;
    }
  | {
      status: "blocked" | "unavailable" | "error";
      code: string;
      series: VerifiedRateSeriesKey;
    };

export type RateProvider = {
  id: string;
  family: string;
  supports: (category: RateCategory) => boolean;
  fetch: (input: {
    category: RateCategory;
    citySlug?: string | null;
    signal?: AbortSignal;
  }) => Promise<ProviderFetchResult>;
};
