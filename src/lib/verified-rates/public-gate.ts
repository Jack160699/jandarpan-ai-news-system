import "server-only";

import { getHistoryDiagnostics } from "@/lib/verified-rates/repository";
import type { FuelCitySlug, RateCategory } from "@/lib/verified-rates/types";

/** Hub / methodology pages remain indexable without live prices (Option C). */
const ALWAYS_INDEXABLE = new Set([
  "/rates",
  "/rates/chhattisgarh",
  "/rates/methodology",
]);

export function isAlwaysIndexableRatePath(path: string): boolean {
  return ALWAYS_INDEXABLE.has(path);
}

/** Detail / dataset pages need ≥1 accepted snapshot before indexing. */
export async function seriesHasAcceptedSnapshot(opts: {
  category: RateCategory;
  citySlug?: string | null;
}): Promise<boolean> {
  const d = await getHistoryDiagnostics({
    category: opts.category,
    citySlug: opts.citySlug ?? null,
  });
  return d.snapshotCount > 0;
}

export async function isRatePathIndexable(opts: {
  path: string;
  category: RateCategory;
  citySlug?: string | null;
}): Promise<boolean> {
  if (isAlwaysIndexableRatePath(opts.path)) return true;
  return seriesHasAcceptedSnapshot({
    category: opts.category,
    citySlug: opts.citySlug,
  });
}

/** Homepage links to empty detail pages stay hidden until any series has data. */
export async function isVerifiedRatesPublicNavEnabled(): Promise<boolean> {
  if (process.env.VERIFIED_RATES_PUBLIC_NAV === "0") return false;
  if (process.env.VERIFIED_RATES_PUBLIC_NAV === "1") {
    // Explicit allow still requires at least one accepted snapshot (no empty SEO funnel).
  }
  const fuelCities: FuelCitySlug[] = ["raipur", "durg", "bhilai"];
  const fuelCats: RateCategory[] = ["petrol", "diesel"];
  for (const city of fuelCities) {
    for (const category of fuelCats) {
      if (await seriesHasAcceptedSnapshot({ category, citySlug: city })) return true;
    }
  }
  for (const category of ["gold_24k", "gold_22k", "silver_999"] as RateCategory[]) {
    if (await seriesHasAcceptedSnapshot({ category, citySlug: null })) return true;
  }
  return false;
}

/** Skip Production cron noise when no provider is enabled. */
export function areVerifiedRatesProvidersConfigured(): boolean {
  const fuel =
    process.env.VERIFIED_RATES_FUEL_ENABLED === "1" &&
    Boolean(process.env.ULIP_API_KEY?.trim() && process.env.ULIP_CLIENT_ID?.trim());
  const fuel2 =
    process.env.VERIFIED_RATES_FUEL_IOCL_ENABLED === "1" &&
    Boolean(process.env.IOCL_RATES_API_KEY?.trim());
  const bullion =
    process.env.VERIFIED_RATES_BULLION_ENABLED === "1" &&
    Boolean(process.env.IBJA_ACCESS_TOKEN?.trim()) &&
    process.env.IBJA_DISPLAY_CONSENT === "1";
  return fuel || fuel2 || bullion;
}
