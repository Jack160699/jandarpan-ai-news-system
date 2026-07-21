/**
 * Deterministic district preference resolution.
 * Priority: explicit → profile → local → geo → Raipur default.
 */

import { getDistrict } from "@/lib/regional/districts";
import {
  DEFAULT_DISTRICT_SLUG,
  type DistrictResolutionSource,
  type LocationPermissionState,
} from "./constants";

export type DistrictResolutionInput = {
  /** URL path / ?district= / active selector choice */
  explicitSlug?: string | null;
  /** Authenticated profile district when a real field exists */
  profileSlug?: string | null;
  /** Cookie / localStorage saved preference */
  localSlug?: string | null;
  /** Browser-location-derived district (coarse slug only) */
  geoSlug?: string | null;
  locationPermission?: LocationPermissionState | null;
  /** Persisted resolution source — distinguishes default Raipur from a real save */
  districtSource?: DistrictResolutionSource | null;
  /**
   * When true, a prior manual choice must not be overwritten by geo
   * even if geoSlug is present.
   */
  manualLock?: boolean;
};

export type DistrictResolution = {
  slug: string;
  source: DistrictResolutionSource;
  reason: string;
};

function normalizeSlug(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;
  const d = getDistrict(raw.trim().toLowerCase());
  return d?.slug ?? null;
}

function isRealLocalSave(
  local: string | null,
  source: DistrictResolutionSource | null | undefined
): boolean {
  if (!local) return false;
  if (source === "explicit" || source === "local" || source === "profile") {
    return true;
  }
  // Legacy saves without source: any non-default district is a real preference
  if (!source && local !== DEFAULT_DISTRICT_SLUG) return true;
  return false;
}

/**
 * Resolve the active home district without I/O.
 * Safe for SSR and client; both should pass the same cookie/local values
 * to avoid hydration flicker (geo only applied client-side after grant).
 */
export function resolveDistrictPreference(
  input: DistrictResolutionInput = {}
): DistrictResolution {
  const explicit = normalizeSlug(input.explicitSlug);
  if (explicit) {
    return {
      slug: explicit,
      source: "explicit",
      reason: "explicit_user_choice",
    };
  }

  const profile = normalizeSlug(input.profileSlug);
  if (profile) {
    return {
      slug: profile,
      source: "profile",
      reason: "authenticated_profile_district",
    };
  }

  const local = normalizeSlug(input.localSlug);
  if (isRealLocalSave(local, input.districtSource)) {
    return {
      slug: local!,
      source: input.districtSource === "profile" ? "profile" : "local",
      reason: "saved_local_preference",
    };
  }

  const permission = input.locationPermission ?? "unknown";
  const geoSlug = normalizeSlug(input.geoSlug);
  const geoBlocked =
    input.manualLock === true ||
    input.districtSource === "explicit" ||
    input.districtSource === "local" ||
    input.districtSource === "profile";

  if (permission === "granted" && geoSlug && !geoBlocked) {
    return {
      slug: geoSlug,
      source: "geo",
      reason: "browser_location_nearest_district",
    };
  }

  return {
    slug: DEFAULT_DISTRICT_SLUG,
    source: "default_raipur",
    reason: "raipur_default_fallback",
  };
}

/** Server-safe: cookie/local only — never blocks on geolocation */
export function resolveServerDistrict(input: {
  explicitSlug?: string | null;
  profileSlug?: string | null;
  cookieSlug?: string | null;
  districtSource?: DistrictResolutionSource | null;
}): DistrictResolution {
  return resolveDistrictPreference({
    explicitSlug: input.explicitSlug,
    profileSlug: input.profileSlug,
    localSlug: input.cookieSlug,
    districtSource: input.districtSource ?? (input.cookieSlug ? "local" : null),
    geoSlug: null,
    manualLock: true,
  });
}
