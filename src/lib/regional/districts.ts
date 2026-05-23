/**
 * Chhattisgarh district registry — prioritization tiers for hyperlocal routing
 */

export const CG_STATE_SLUG = "chhattisgarh" as const;

export type DistrictPriorityTier = 1 | 2 | 3;

export type CgDistrict = {
  slug: string;
  name: string;
  nameHi: string;
  priority: DistrictPriorityTier;
  /** Routing weight 0–1 for homepage / feed scoring */
  routingWeight: number;
  aliases: string[];
  lat?: number;
  lng?: number;
};

/** Tier-1 districts surface first in hyperlocal feeds and breaking routing */
export const CG_DISTRICTS: CgDistrict[] = [
  {
    slug: "raipur",
    name: "Raipur",
    nameHi: "रायपुर",
    priority: 1,
    routingWeight: 1,
    aliases: ["raipur", "रायपुर", "naya raipur", "नया रायपुर", "capital"],
    lat: 21.2514,
    lng: 81.6296,
  },
  {
    slug: "bilaspur",
    name: "Bilaspur",
    nameHi: "बिलासपुर",
    priority: 1,
    routingWeight: 0.95,
    aliases: ["bilaspur", "बिलासपुर"],
    lat: 22.0797,
    lng: 82.1391,
  },
  {
    slug: "durg",
    name: "Durg",
    nameHi: "दुर्ग",
    priority: 1,
    routingWeight: 0.92,
    aliases: ["durg", "दुर्ग", "bhilai", "भिलाई", "durg-bhilai"],
    lat: 21.1938,
    lng: 81.3509,
  },
  {
    slug: "korba",
    name: "Korba",
    nameHi: "कोरबा",
    priority: 1,
    routingWeight: 0.9,
    aliases: ["korba", "कोरबा"],
    lat: 22.3595,
    lng: 82.7501,
  },
  {
    slug: "bastar",
    name: "Bastar",
    nameHi: "बस्तर",
    priority: 2,
    routingWeight: 0.82,
    aliases: ["bastar", "बस्तर", "jagdalpur", "जगदलपुर"],
    lat: 19.0748,
    lng: 82.0082,
  },
  {
    slug: "raigarh",
    name: "Raigarh",
    nameHi: "रायगढ़",
    priority: 2,
    routingWeight: 0.8,
    aliases: ["raigarh", "रायगढ़", "रायगढ"],
    lat: 21.8974,
    lng: 83.395,
  },
  {
    slug: "rajnandgaon",
    name: "Rajnandgaon",
    nameHi: "राजनांदगाँव",
    priority: 2,
    routingWeight: 0.78,
    aliases: ["rajnandgaon", "राजनांदगाँव", "राजनांदगांव"],
    lat: 21.0972,
    lng: 81.0364,
  },
  {
    slug: "dhamtari",
    name: "Dhamtari",
    nameHi: "धमतरी",
    priority: 2,
    routingWeight: 0.76,
    aliases: ["dhamtari", "धमतरी"],
    lat: 20.707,
    lng: 81.548,
  },
  {
    slug: "janjgir-champa",
    name: "Janjgir-Champa",
    nameHi: "जांजगीर-चांपा",
    priority: 2,
    routingWeight: 0.75,
    aliases: ["janjgir", "champa", "जांजगीर", "चांपा"],
    lat: 22.0097,
    lng: 82.5784,
  },
  {
    slug: "ambikapur",
    name: "Ambikapur (Surguja)",
    nameHi: "अंबिकापुर",
    priority: 2,
    routingWeight: 0.74,
    aliases: ["ambikapur", "surguja", "surajpur", "अंबिकापुर", "सरगुजा"],
    lat: 23.12,
    lng: 83.195,
  },
  {
    slug: "kanker",
    name: "Kanker",
    nameHi: "कांकेर",
    priority: 3,
    routingWeight: 0.68,
    aliases: ["kanker", "कांकेर"],
  },
  {
    slug: "mahasamund",
    name: "Mahasamund",
    nameHi: "महासमुंद",
    priority: 3,
    routingWeight: 0.66,
    aliases: ["mahasamund", "महासमुंद"],
  },
  {
    slug: "korea",
    name: "Korea",
    nameHi: "कोरिया",
    priority: 3,
    routingWeight: 0.64,
    aliases: ["korea", "koriya", "कोरिया"],
  },
  {
    slug: "dantewada",
    name: "Dantewada",
    nameHi: "दंतेवाड़ा",
    priority: 3,
    routingWeight: 0.62,
    aliases: ["dantewada", "दंतेवाड़ा", "dantewara"],
  },
  {
    slug: "sukma",
    name: "Sukma",
    nameHi: "सुकमा",
    priority: 3,
    routingWeight: 0.6,
    aliases: ["sukma", "सुकमा"],
  },
  {
    slug: "bemetara",
    name: "Bemetara",
    nameHi: "बेमेतरा",
    priority: 3,
    routingWeight: 0.58,
    aliases: ["bemetara", "बेमेतरा"],
  },
  {
    slug: "mungeli",
    name: "Mungeli",
    nameHi: "मुंगेली",
    priority: 3,
    routingWeight: 0.56,
    aliases: ["mungeli", "मुंगेली"],
  },
  {
    slug: "balod",
    name: "Balod",
    nameHi: "बालोद",
    priority: 3,
    routingWeight: 0.54,
    aliases: ["balod", "बालोद"],
  },
  {
    slug: "gariaband",
    name: "Gariaband",
    nameHi: "गरियाबंद",
    priority: 3,
    routingWeight: 0.52,
    aliases: ["gariaband", "गरियाबंद"],
  },
  {
    slug: "narayanpur",
    name: "Narayanpur",
    nameHi: "नारायणपुर",
    priority: 3,
    routingWeight: 0.5,
    aliases: ["narayanpur", "नारायणपुर"],
  },
];

const DISTRICT_BY_SLUG = new Map(CG_DISTRICTS.map((d) => [d.slug, d]));

export function getDistrict(slug: string): CgDistrict | undefined {
  return DISTRICT_BY_SLUG.get(slug);
}

export function getAllDistrictSlugs(): string[] {
  return CG_DISTRICTS.map((d) => d.slug);
}

/** Districts ordered for feed surfacing (tier 1 first, then weight) */
export function getPrioritizedDistricts(): CgDistrict[] {
  return [...CG_DISTRICTS].sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    return b.routingWeight - a.routingWeight;
  });
}

export function districtPriorityBoost(slug: string): number {
  const d = getDistrict(slug);
  if (!d) return 0;
  if (d.priority === 1) return 14;
  if (d.priority === 2) return 9;
  return 5;
}
