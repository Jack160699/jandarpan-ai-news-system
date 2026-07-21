/**
 * Nearest-district mapping from browser coordinates using bundled HQ lat/lng.
 * No paid reverse-geocoding; does not persist precise coordinates.
 */

import { CG_DISTRICTS, getDistrict } from "@/lib/regional/districts";
import {
  GEO_MAX_MATCH_KM,
  NEARBY_MAX_COUNT,
  NEARBY_MAX_KM,
} from "./constants";

export type LatLng = { lat: number; lng: number };

export type DistrictDistance = {
  slug: string;
  km: number;
};

/** Haversine distance in kilometres */
export function haversineKm(a: LatLng, b: LatLng): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

function districtsWithCoords() {
  return CG_DISTRICTS.filter(
    (d): d is typeof d & { lat: number; lng: number } =>
      typeof d.lat === "number" && typeof d.lng === "number"
  );
}

/** Map coords → nearest official district HQ within GEO_MAX_MATCH_KM */
export function districtFromCoordinates(
  coords: LatLng,
  maxKm: number = GEO_MAX_MATCH_KM
): DistrictDistance | null {
  let best: DistrictDistance | null = null;
  for (const d of districtsWithCoords()) {
    const km = haversineKm(coords, { lat: d.lat, lng: d.lng });
    if (km > maxKm) continue;
    if (!best || km < best.km) {
      best = { slug: d.slug, km };
    }
  }
  return best;
}

/** Neighboring districts by HQ distance (excludes self) */
export function getNearbyDistricts(
  slug: string,
  options?: { maxKm?: number; maxCount?: number }
): DistrictDistance[] {
  const maxKm = options?.maxKm ?? NEARBY_MAX_KM;
  const maxCount = options?.maxCount ?? NEARBY_MAX_COUNT;
  const origin = getDistrict(slug);
  if (!origin || origin.lat == null || origin.lng == null) return [];

  const originPoint = { lat: origin.lat, lng: origin.lng };
  const neighbors: DistrictDistance[] = [];

  for (const d of districtsWithCoords()) {
    if (d.slug === origin.slug) continue;
    const km = haversineKm(originPoint, { lat: d.lat, lng: d.lng });
    if (km <= maxKm) neighbors.push({ slug: d.slug, km });
  }

  return neighbors.sort((a, b) => a.km - b.km).slice(0, maxCount);
}

export function isNearbyDistrict(
  selectedSlug: string,
  candidateSlug: string
): boolean {
  return getNearbyDistricts(selectedSlug).some((n) => n.slug === candidateSlug);
}
