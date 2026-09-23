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

import { unstable_cache } from "next/cache";
import { verifiedRatesDb } from "@/lib/verified-rates/db";

async function checkAnyAcceptedSnapshot(): Promise<boolean> {
  try {
    const supabase = verifiedRatesDb();
    const { data, error } = await supabase
      .from("verified_rate_snapshots")
      .select("id")
      .eq("status", "accepted")
      .limit(1);
    if (error) return false;
    return Boolean(data && data.length > 0);
  } catch {
    return false;
  }
}

async function isVerifiedRatesPublicNavEnabledRaw(): Promise<boolean> {
  if (process.env.VERIFIED_RATES_PUBLIC_NAV === "0") return false;
  return checkAnyAcceptedSnapshot();
}

const getCachedVerifiedRatesPublicNav = unstable_cache(
  isVerifiedRatesPublicNavEnabledRaw,
  ["verified-rates-nav-enabled"],
  {
    revalidate: 300,
    tags: ["verified-rates-nav-enabled"],
  }
);

/** Homepage links to empty detail pages stay hidden until any series has data. */
export async function isVerifiedRatesPublicNavEnabled(): Promise<boolean> {
  try {
    return await getCachedVerifiedRatesPublicNav();
  } catch {
    return isVerifiedRatesPublicNavEnabledRaw();
  }
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
