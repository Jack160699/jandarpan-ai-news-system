/**
 * Location permission persistence + respectful request helpers.
 * Never stores precise coordinates — only derived district slug.
 */

import { getDistrict } from "@/lib/regional/districts";
import {
  DISTRICT_SOURCE_KEY,
  GEO_DERIVED_DISTRICT_KEY,
  LOCATION_PERMISSION_KEY,
  type DistrictResolutionSource,
  type LocationPermissionState,
} from "./constants";
import { districtFromCoordinates } from "./geo";

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

export function readLocationPermission(): LocationPermissionState {
  if (!canUseStorage()) return "unknown";
  try {
    const v = localStorage.getItem(LOCATION_PERMISSION_KEY);
    if (
      v === "prompted" ||
      v === "granted" ||
      v === "denied" ||
      v === "unavailable" ||
      v === "timeout" ||
      v === "inaccurate"
    ) {
      return v;
    }
  } catch {
    /* private mode */
  }
  return "unknown";
}

export function writeLocationPermission(state: LocationPermissionState): void {
  if (!canUseStorage()) return;
  try {
    localStorage.setItem(LOCATION_PERMISSION_KEY, state);
  } catch {
    /* ignore */
  }
}

export function shouldAskForLocation(): boolean {
  const state = readLocationPermission();
  return state === "unknown";
}

export function readGeoDerivedDistrict(): string | null {
  if (!canUseStorage()) return null;
  try {
    const slug = localStorage.getItem(GEO_DERIVED_DISTRICT_KEY);
    if (!slug) return null;
    return getDistrict(slug)?.slug ?? null;
  } catch {
    return null;
  }
}

export function writeGeoDerivedDistrict(slug: string | null): void {
  if (!canUseStorage()) return;
  try {
    if (!slug) {
      localStorage.removeItem(GEO_DERIVED_DISTRICT_KEY);
      return;
    }
    const normalized = getDistrict(slug)?.slug;
    if (normalized) localStorage.setItem(GEO_DERIVED_DISTRICT_KEY, normalized);
  } catch {
    /* ignore */
  }
}

export function readDistrictSource(): DistrictResolutionSource | null {
  if (!canUseStorage()) return null;
  try {
    const v = localStorage.getItem(DISTRICT_SOURCE_KEY);
    if (
      v === "explicit" ||
      v === "profile" ||
      v === "local" ||
      v === "geo" ||
      v === "default_raipur"
    ) {
      return v;
    }
  } catch {
    /* ignore */
  }
  return null;
}

export function writeDistrictSource(source: DistrictResolutionSource): void {
  if (!canUseStorage()) return;
  try {
    localStorage.setItem(DISTRICT_SOURCE_KEY, source);
  } catch {
    /* ignore */
  }
}

/** Manual choice locks out later geolocation overwrites */
export function isManualDistrictLocked(): boolean {
  const source = readDistrictSource();
  return source === "explicit" || source === "local" || source === "profile";
}

export type LocateResult =
  | { ok: true; slug: string; km: number }
  | {
      ok: false;
      state: Extract<
        LocationPermissionState,
        "denied" | "unavailable" | "timeout" | "inaccurate"
      >;
    };

/**
 * Request browser location once and map to nearest district HQ.
 * Does not persist lat/lng. Marks permission so we never re-prompt after deny.
 */
export function requestDistrictFromBrowserLocation(
  options?: PositionOptions
): Promise<LocateResult> {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      writeLocationPermission("unavailable");
      resolve({ ok: false, state: "unavailable" });
      return;
    }

    writeLocationPermission("prompted");

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const accuracy = pos.coords.accuracy;
        if (typeof accuracy === "number" && accuracy > 50_000) {
          writeLocationPermission("inaccurate");
          resolve({ ok: false, state: "inaccurate" });
          return;
        }
        const match = districtFromCoordinates({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
        if (!match) {
          writeLocationPermission("inaccurate");
          resolve({ ok: false, state: "inaccurate" });
          return;
        }
        writeLocationPermission("granted");
        writeGeoDerivedDistrict(match.slug);
        resolve({ ok: true, slug: match.slug, km: match.km });
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          writeLocationPermission("denied");
          resolve({ ok: false, state: "denied" });
          return;
        }
        if (err.code === err.TIMEOUT) {
          writeLocationPermission("timeout");
          resolve({ ok: false, state: "timeout" });
          return;
        }
        writeLocationPermission("unavailable");
        resolve({ ok: false, state: "unavailable" });
      },
      {
        enableHighAccuracy: false,
        maximumAge: 600_000,
        timeout: 8_000,
        ...options,
      }
    );
  });
}
