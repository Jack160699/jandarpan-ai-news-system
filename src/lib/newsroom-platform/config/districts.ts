import type { DistrictHubMeta } from "../content/types";

/** Featured district wire slugs (homepage + /districts/*) */
export const PLATFORM_DISTRICT_SLUGS = [
  "raipur",
  "bilaspur",
  "durg",
  "raigarh",
  "korba",
  "jagdalpur",
] as const;

export type PlatformDistrictSlug = (typeof PLATFORM_DISTRICT_SLUGS)[number];

export const PLATFORM_DISTRICTS: DistrictHubMeta[] = [
  {
    slug: "raipur",
    nameEn: "Raipur",
    nameHi: "रायपुर",
    storyCount: 0,
    liveCount: 0,
    sections: ["top", "crime", "politics", "jobs", "weather", "alerts"],
  },
  {
    slug: "bilaspur",
    nameEn: "Bilaspur",
    nameHi: "बिलासपुर",
    storyCount: 0,
    liveCount: 0,
    sections: ["top", "crime", "politics", "jobs", "weather", "alerts"],
  },
  {
    slug: "durg",
    nameEn: "Durg",
    nameHi: "दुर्ग",
    storyCount: 0,
    liveCount: 0,
    sections: ["top", "crime", "politics", "jobs", "weather", "alerts"],
  },
  {
    slug: "raigarh",
    nameEn: "Raigarh",
    nameHi: "रायगढ़",
    storyCount: 0,
    liveCount: 0,
    sections: ["top", "crime", "politics", "jobs", "weather", "alerts"],
  },
  {
    slug: "korba",
    nameEn: "Korba",
    nameHi: "कोरबा",
    storyCount: 0,
    liveCount: 0,
    sections: ["top", "crime", "politics", "jobs", "weather", "alerts"],
  },
  {
    slug: "jagdalpur",
    nameEn: "Jagdalpur",
    nameHi: "जगदलपुर",
    storyCount: 0,
    liveCount: 0,
    sections: ["top", "crime", "politics", "jobs", "weather", "alerts"],
  },
];

export function getPlatformDistrict(slug: string): DistrictHubMeta | null {
  return PLATFORM_DISTRICTS.find((d) => d.slug === slug) ?? null;
}

export function isPlatformDistrictSlug(slug: string): slug is PlatformDistrictSlug {
  return (PLATFORM_DISTRICT_SLUGS as readonly string[]).includes(slug);
}
