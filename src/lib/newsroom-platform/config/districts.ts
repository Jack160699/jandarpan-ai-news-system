import type { DistrictHubMeta } from "../content/types";
import {
  getPlatformDistrictHub,
  getPlatformDistrictSlugs,
  loadPlatformDistrictsHub,
} from "@/lib/platform-admin/districts";

export type PlatformDistrictSlug = string;

/** @deprecated Use loadPlatformDistricts() — loaded from Supabase */
export const PLATFORM_DISTRICT_SLUGS: readonly string[] = [];

/** @deprecated Use loadPlatformDistricts() */
export const PLATFORM_DISTRICTS: DistrictHubMeta[] = [];

export async function loadPlatformDistricts(): Promise<DistrictHubMeta[]> {
  return loadPlatformDistrictsHub();
}

export async function getPlatformDistrict(
  slug: string
): Promise<DistrictHubMeta | null> {
  return getPlatformDistrictHub(slug);
}

export async function isPlatformDistrictSlug(slug: string): Promise<boolean> {
  const slugs = await getPlatformDistrictSlugs();
  return slugs.includes(slug);
}
