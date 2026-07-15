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

export type DistrictAvailability = "available" | "coming-soon";

export type CgDistrictDirectoryEntry = {
  slug: string;
  name: string;
  nameHi: string;
  aliases: string[];
  availability: DistrictAvailability;
  /** Available districts retain their routing data and existing public URL. */
  district?: CgDistrict;
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

/**
 * Official districts not yet backed by a Jan Darpan district feed.
 * Keeping them beside the supported registry prevents visual-only lists from
 * drifting while ensuring unsupported slugs never silently route to Raipur.
 */
const CG_COMING_SOON_DISTRICTS: Array<
  Pick<CgDistrictDirectoryEntry, "slug" | "name" | "nameHi" | "aliases">
> = [
  {
    slug: "baloda-bazar-bhatapara",
    name: "Baloda Bazar-Bhatapara",
    nameHi: "बलौदा बाजार-भाटापारा",
    aliases: ["baloda bazar", "bhatapara", "बलौदा बाजार", "भाटापारा"],
  },
  {
    slug: "balrampur-ramanujganj",
    name: "Balrampur-Ramanujganj",
    nameHi: "बलरामपुर-रामानुजगंज",
    aliases: ["balrampur", "ramanujganj", "बलरामपुर", "रामानुजगंज"],
  },
  {
    slug: "bijapur",
    name: "Bijapur",
    nameHi: "बीजापुर",
    aliases: ["bijapur", "बीजापुर"],
  },
  {
    slug: "gaurela-pendra-marwahi",
    name: "Gaurela-Pendra-Marwahi",
    nameHi: "गौरेला-पेण्ड्रा-मरवाही",
    aliases: ["gaurela", "pendra", "marwahi", "गौरेला", "पेण्ड्रा", "मरवाही"],
  },
  {
    slug: "jashpur",
    name: "Jashpur",
    nameHi: "जशपुर",
    aliases: ["jashpur", "जशपुर"],
  },
  {
    slug: "kabirdham",
    name: "Kabirdham",
    nameHi: "कबीरधाम",
    aliases: ["kabirdham", "kawardha", "कबीरधाम", "कवर्धा"],
  },
  {
    slug: "khairagarh-chhuikhadan-gandai",
    name: "Khairagarh-Chhuikhadan-Gandai",
    nameHi: "खैरागढ़-छुईखदान-गंडई",
    aliases: ["khairagarh", "chhuikhadan", "gandai", "खैरागढ़", "छुईखदान", "गंडई"],
  },
  {
    slug: "kondagaon",
    name: "Kondagaon",
    nameHi: "कोण्डागांव",
    aliases: ["kondagaon", "कोण्डागांव", "कोंडागांव"],
  },
  {
    slug: "manendragarh-chirmiri-bharatpur",
    name: "Manendragarh-Chirmiri-Bharatpur",
    nameHi: "मनेन्द्रगढ़-चिरमिरी-भरतपुर",
    aliases: ["manendragarh", "chirmiri", "bharatpur", "मनेन्द्रगढ़", "चिरमिरी", "भरतपुर"],
  },
  {
    slug: "mohla-manpur-ambagarh-chowki",
    name: "Mohla-Manpur-Ambagarh Chowki",
    nameHi: "मोहला-मानपुर-अम्बागढ़ चौकी",
    aliases: ["mohla", "manpur", "ambagarh chowki", "मोहला", "मानपुर", "अम्बागढ़ चौकी"],
  },
  {
    slug: "sakti",
    name: "Sakti",
    nameHi: "सक्ती",
    aliases: ["sakti", "सक्ती"],
  },
  {
    slug: "sarangarh-bilaigarh",
    name: "Sarangarh-Bilaigarh",
    nameHi: "सारंगढ़-बिलाईगढ़",
    aliases: ["sarangarh", "bilaigarh", "सारंगढ़", "बिलाईगढ़"],
  },
  {
    slug: "surajpur",
    name: "Surajpur",
    nameHi: "सूरजपुर",
    aliases: ["surajpur", "सूरजपुर"],
  },
];

/** Single directory used by selectors, validation, feeds, routes and SEO. */
export const CHHATTISGARH_DISTRICT_DIRECTORY: CgDistrictDirectoryEntry[] = [
  ...CG_DISTRICTS.map((district) => ({
    slug: district.slug,
    name: district.name,
    nameHi: district.nameHi,
    aliases: district.aliases,
    availability: "available" as const,
    district,
  })),
  ...CG_COMING_SOON_DISTRICTS.map((district) => ({
    ...district,
    availability: "coming-soon" as const,
  })),
].sort((a, b) => a.name.localeCompare(b.name, "en-IN"));

export function getDistrictDirectory(): CgDistrictDirectoryEntry[] {
  return CHHATTISGARH_DISTRICT_DIRECTORY;
}

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
