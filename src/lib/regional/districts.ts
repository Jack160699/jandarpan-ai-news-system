/**
 * Chhattisgarh district registry — 33 official districts with coverage tiers
 */

export const CG_STATE_SLUG = "chhattisgarh" as const;

export const ACTIVE_DISTRICT_COUNT = 33 as const;

export type DistrictPriorityTier = 1 | 2 | 3;

export type DistrictTierLabel = "high" | "medium" | "low";

export type DistrictDailyTarget = 8 | 4 | 2;

export type CgDistrict = {
  slug: string;
  name: string;
  nameHi: string;
  priority: DistrictPriorityTier;
  tierLabel: DistrictTierLabel;
  dailyTarget: DistrictDailyTarget;
  /** Routing weight 0–1 for homepage / feed scoring */
  routingWeight: number;
  aliases: string[];
  lat?: number;
  lng?: number;
};

const HIGH = {
  priority: 1 as const,
  tierLabel: "high" as const,
  dailyTarget: 8 as const,
};

const MEDIUM = {
  priority: 2 as const,
  tierLabel: "medium" as const,
  dailyTarget: 4 as const,
};

const LOW = {
  priority: 3 as const,
  tierLabel: "low" as const,
  dailyTarget: 2 as const,
};

/**
 * Official 33 Chhattisgarh districts.
 * High (8): raipur, durg, bilaspur, korba, raigarh, rajnandgaon, bastar, janjgir-champa
 * Medium (12): dhamtari, mahasamund, bemetara, balod, mungeli, gariaband, kanker,
 *   dantewada, kabirdham, jashpur, surguja, surajpur
 * Low (13): remaining
 *
 * Surguja HQ is Ambikapur — `ambikapur` is an alias of `surguja` only.
 * Surajpur is a separate district (not aliased under surguja).
 */
export const CG_DISTRICTS: CgDistrict[] = [
  // —— High (8) ——
  {
    slug: "raipur",
    name: "Raipur",
    nameHi: "रायपुर",
    ...HIGH,
    routingWeight: 1,
    aliases: ["raipur", "रायपुर", "naya raipur", "नया रायपुर", "capital"],
    lat: 21.2514,
    lng: 81.6296,
  },
  {
    slug: "durg",
    name: "Durg",
    nameHi: "दुर्ग",
    ...HIGH,
    routingWeight: 0.95,
    aliases: ["durg", "दुर्ग", "bhilai", "भिलाई", "durg-bhilai"],
    lat: 21.1938,
    lng: 81.3509,
  },
  {
    slug: "bilaspur",
    name: "Bilaspur",
    nameHi: "बिलासपुर",
    ...HIGH,
    routingWeight: 0.93,
    aliases: ["bilaspur", "बिलासपुर"],
    lat: 22.0797,
    lng: 82.1391,
  },
  {
    slug: "korba",
    name: "Korba",
    nameHi: "कोरबा",
    ...HIGH,
    routingWeight: 0.91,
    aliases: ["korba", "कोरबा"],
    lat: 22.3595,
    lng: 82.7501,
  },
  {
    slug: "raigarh",
    name: "Raigarh",
    nameHi: "रायगढ़",
    ...HIGH,
    routingWeight: 0.89,
    aliases: ["raigarh", "रायगढ़", "रायगढ"],
    lat: 21.8974,
    lng: 83.395,
  },
  {
    slug: "rajnandgaon",
    name: "Rajnandgaon",
    nameHi: "राजनांदगाँव",
    ...HIGH,
    routingWeight: 0.87,
    aliases: ["rajnandgaon", "राजनांदगाँव", "राजनांदगांव"],
    lat: 21.0972,
    lng: 81.0364,
  },
  {
    slug: "bastar",
    name: "Bastar",
    nameHi: "बस्तर",
    ...HIGH,
    routingWeight: 0.85,
    aliases: ["bastar", "बस्तर", "jagdalpur", "जगदलपुर"],
    lat: 19.0748,
    lng: 82.0082,
  },
  {
    slug: "janjgir-champa",
    name: "Janjgir-Champa",
    nameHi: "जांजगीर-चांपा",
    ...HIGH,
    routingWeight: 0.83,
    aliases: ["janjgir-champa", "janjgir", "champa", "जांजगीर", "चांपा"],
    lat: 22.0097,
    lng: 82.5784,
  },

  // —— Medium (12) ——
  {
    slug: "dhamtari",
    name: "Dhamtari",
    nameHi: "धमतरी",
    ...MEDIUM,
    routingWeight: 0.78,
    aliases: ["dhamtari", "धमतरी"],
    lat: 20.707,
    lng: 81.548,
  },
  {
    slug: "mahasamund",
    name: "Mahasamund",
    nameHi: "महासमुंद",
    ...MEDIUM,
    routingWeight: 0.76,
    aliases: ["mahasamund", "महासमुंद"],
  },
  {
    slug: "bemetara",
    name: "Bemetara",
    nameHi: "बेमेतरा",
    ...MEDIUM,
    routingWeight: 0.74,
    aliases: ["bemetara", "बेमेतरा"],
  },
  {
    slug: "balod",
    name: "Balod",
    nameHi: "बालोद",
    ...MEDIUM,
    routingWeight: 0.72,
    aliases: ["balod", "बालोद"],
  },
  {
    slug: "mungeli",
    name: "Mungeli",
    nameHi: "मुंगेली",
    ...MEDIUM,
    routingWeight: 0.7,
    aliases: ["mungeli", "मुंगेली"],
  },
  {
    slug: "gariaband",
    name: "Gariaband",
    nameHi: "गरियाबंद",
    ...MEDIUM,
    routingWeight: 0.68,
    aliases: ["gariaband", "गरियाबंद"],
  },
  {
    slug: "kanker",
    name: "Kanker",
    nameHi: "कांकेर",
    ...MEDIUM,
    routingWeight: 0.66,
    aliases: ["kanker", "कांकेर"],
  },
  {
    slug: "dantewada",
    name: "Dantewada",
    nameHi: "दंतेवाड़ा",
    ...MEDIUM,
    routingWeight: 0.64,
    aliases: ["dantewada", "दंतेवाड़ा", "dantewara"],
  },
  {
    slug: "kabirdham",
    name: "Kabirdham",
    nameHi: "कबीरधाम",
    ...MEDIUM,
    routingWeight: 0.62,
    aliases: ["kabirdham", "कबीरधाम", "kawardha", "कवर्धा"],
  },
  {
    slug: "jashpur",
    name: "Jashpur",
    nameHi: "जशपुर",
    ...MEDIUM,
    routingWeight: 0.6,
    aliases: ["jashpur", "जशपुर"],
  },
  {
    slug: "surguja",
    name: "Surguja",
    nameHi: "सरगुजा",
    ...MEDIUM,
    routingWeight: 0.58,
    // HQ Ambikapur — do NOT alias surajpur here (separate district)
    aliases: ["surguja", "सरगुजा", "ambikapur", "अंबिकापुर"],
    lat: 23.12,
    lng: 83.195,
  },
  {
    slug: "surajpur",
    name: "Surajpur",
    nameHi: "सूरजपुर",
    ...MEDIUM,
    routingWeight: 0.56,
    aliases: ["surajpur", "सूरजपुर"],
  },

  // —— Low (13) ——
  {
    slug: "baloda-bazar",
    name: "Baloda Bazar",
    nameHi: "बलौदा बाजार",
    ...LOW,
    routingWeight: 0.5,
    aliases: ["baloda-bazar", "baloda bazar", "बलौदा बाजार", "balodabazar"],
  },
  {
    slug: "balrampur",
    name: "Balrampur",
    nameHi: "बलरामपुर",
    ...LOW,
    routingWeight: 0.48,
    aliases: ["balrampur", "बलरामपुर"],
  },
  {
    slug: "bijapur",
    name: "Bijapur",
    nameHi: "बीजापुर",
    ...LOW,
    routingWeight: 0.46,
    aliases: ["bijapur", "बीजापुर"],
  },
  {
    slug: "gaurela-pendra-marwahi",
    name: "Gaurela-Pendra-Marwahi",
    nameHi: "गौरेला-पेण्ड्रा-मरवाही",
    ...LOW,
    routingWeight: 0.44,
    aliases: [
      "gaurela-pendra-marwahi",
      "gaurela",
      "pendra",
      "marwahi",
      "गौरेला",
      "पेण्ड्रा",
      "मरवाही",
    ],
  },
  {
    slug: "khairagarh-chhuikhadan-gandai",
    name: "Khairagarh-Chhuikhadan-Gandai",
    nameHi: "खैरागढ़-छुईखदान-गंडई",
    ...LOW,
    routingWeight: 0.42,
    aliases: [
      "khairagarh-chhuikhadan-gandai",
      "khairagarh",
      "chhuikhadan",
      "gandai",
      "खैरागढ़",
      "छुईखदान",
      "गंडई",
    ],
  },
  {
    slug: "kondagaon",
    name: "Kondagaon",
    nameHi: "कोंडागाँव",
    ...LOW,
    routingWeight: 0.4,
    aliases: ["kondagaon", "कोंडागाँव", "कोंडागांव"],
  },
  {
    slug: "korea",
    name: "Korea",
    nameHi: "कोरिया",
    ...LOW,
    routingWeight: 0.38,
    aliases: ["korea", "koriya", "कोरिया"],
  },
  {
    slug: "manendragarh-chirmiri-bharatpur",
    name: "Manendragarh-Chirmiri-Bharatpur",
    nameHi: "मनेंद्रगढ़-चिरमिरी-भरतपुर",
    ...LOW,
    routingWeight: 0.36,
    aliases: [
      "manendragarh-chirmiri-bharatpur",
      "manendragarh",
      "chirmiri",
      "bharatpur",
      "मनेंद्रगढ़",
      "चिरमिरी",
    ],
  },
  {
    slug: "mohla-manpur-ambagarh-chowki",
    name: "Mohla-Manpur-Ambagarh Chowki",
    nameHi: "मोहला-मानपुर-अम्बागढ़ चौकी",
    ...LOW,
    routingWeight: 0.34,
    aliases: [
      "mohla-manpur-ambagarh-chowki",
      "mohla",
      "manpur",
      "ambagarh chowki",
      "ambagarh",
      "मोहला",
      "मानपुर",
      "अम्बागढ़",
    ],
  },
  {
    slug: "narayanpur",
    name: "Narayanpur",
    nameHi: "नारायणपुर",
    ...LOW,
    routingWeight: 0.32,
    aliases: ["narayanpur", "नारायणपुर"],
  },
  {
    slug: "sakti",
    name: "Sakti",
    nameHi: "सक्ति",
    ...LOW,
    routingWeight: 0.3,
    aliases: ["sakti", "सक्ति", "sakti district"],
  },
  {
    slug: "sarangarh-bilaigarh",
    name: "Sarangarh-Bilaigarh",
    nameHi: "सारंगढ़-बिलाईगढ़",
    ...LOW,
    routingWeight: 0.28,
    aliases: [
      "sarangarh-bilaigarh",
      "sarangarh",
      "bilaigarh",
      "सारंगढ़",
      "बिलाईगढ़",
    ],
  },
  {
    slug: "sukma",
    name: "Sukma",
    nameHi: "सुकमा",
    ...LOW,
    routingWeight: 0.26,
    aliases: ["sukma", "सुकमा"],
  },
];

const DISTRICT_BY_SLUG = new Map(CG_DISTRICTS.map((d) => [d.slug, d]));

const DISTRICT_BY_ALIAS = (() => {
  const map = new Map<string, CgDistrict>();
  for (const d of CG_DISTRICTS) {
    map.set(d.slug, d);
    for (const alias of d.aliases) {
      const key = alias.toLowerCase().trim();
      if (!map.has(key)) map.set(key, d);
    }
  }
  return map;
})();

/** Resolve by official slug or known alias (e.g. ambikapur → surguja). */
export function getDistrict(slug: string): CgDistrict | undefined {
  const key = slug.toLowerCase().trim();
  return DISTRICT_BY_SLUG.get(key) ?? DISTRICT_BY_ALIAS.get(key);
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

export function getDistrictsByTier(tier: DistrictTierLabel): CgDistrict[] {
  return CG_DISTRICTS.filter((d) => d.tierLabel === tier);
}

export function getDailyCoverageTargets(): {
  byDistrict: Record<string, DistrictDailyTarget>;
  byTier: Record<DistrictTierLabel, number>;
  total: number;
} {
  const byDistrict: Record<string, DistrictDailyTarget> = {};
  const byTier: Record<DistrictTierLabel, number> = {
    high: 0,
    medium: 0,
    low: 0,
  };
  for (const d of CG_DISTRICTS) {
    byDistrict[d.slug] = d.dailyTarget;
    byTier[d.tierLabel] += d.dailyTarget;
  }
  return {
    byDistrict,
    byTier,
    total: byTier.high + byTier.medium + byTier.low,
  };
}

/** Runtime guard — throws if registry drifts from the 33-district contract. */
export function assertThirtyThreeDistricts(): void {
  if (CG_DISTRICTS.length !== ACTIVE_DISTRICT_COUNT) {
    throw new Error(
      `Expected ${ACTIVE_DISTRICT_COUNT} districts, got ${CG_DISTRICTS.length}`
    );
  }
  const slugs = CG_DISTRICTS.map((d) => d.slug);
  const unique = new Set(slugs);
  if (unique.size !== ACTIVE_DISTRICT_COUNT) {
    throw new Error("District slugs must be unique");
  }
  const high = getDistrictsByTier("high").length;
  const medium = getDistrictsByTier("medium").length;
  const low = getDistrictsByTier("low").length;
  if (high !== 8 || medium !== 12 || low !== 13) {
    throw new Error(
      `Tier counts must be 8/12/13, got ${high}/${medium}/${low}`
    );
  }
  const { total } = getDailyCoverageTargets();
  if (total !== 138) {
    throw new Error(`Daily coverage targets must sum to 138, got ${total}`);
  }
}
