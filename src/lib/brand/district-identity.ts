/**
 * District identity chips — consistent regional labeling
 */

import { CG_DISTRICTS } from "@/lib/regional/districts";

export type DistrictIdentity = {
  slug: string;
  name: string;
  nameHi: string;
  shortHi: string;
  color: string;
};

/** Earth-tone palette — distinct per tier, not garish */
const TIER_COLORS: Record<1 | 2 | 3, string> = {
  1: "#1a4d3e",
  2: "#2d6b58",
  3: "#5a8f7a",
};

export const DISTRICT_IDENTITIES: DistrictIdentity[] = CG_DISTRICTS.map(
  (d) => ({
    slug: d.slug,
    name: d.name,
    nameHi: d.nameHi,
    shortHi: d.nameHi.split(" ")[0] ?? d.nameHi,
    color: TIER_COLORS[d.priority],
  })
);

export function getDistrictIdentity(slug: string): DistrictIdentity | null {
  return DISTRICT_IDENTITIES.find((d) => d.slug === slug) ?? null;
}

export function districtChipLabel(slug: string): string {
  return getDistrictIdentity(slug)?.nameHi ?? slug;
}
