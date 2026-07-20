import type {
  FuelCitySlug,
  GeoScope,
  RateCategory,
  RateLocation,
  VerifiedRateSeriesKey,
} from "@/lib/verified-rates/types";
import { FUEL_CITY_SLUGS, RATE_CATEGORIES } from "@/lib/verified-rates/types";

export { FUEL_CITY_SLUGS, RATE_CATEGORIES, HISTORY_RANGES } from "@/lib/verified-rates/types";

const CITY_META: Record<
  FuelCitySlug,
  { nameHi: string; nameEn: string; districtSlug: string }
> = {
  raipur: { nameHi: "रायपुर", nameEn: "Raipur", districtSlug: "raipur" },
  durg: { nameHi: "दुर्ग", nameEn: "Durg", districtSlug: "durg" },
  bhilai: { nameHi: "भिलाई", nameEn: "Bhilai", districtSlug: "durg" },
};

export type CategoryMeta = {
  category: RateCategory;
  group: "fuel" | "bullion";
  labelHi: string;
  labelEn: string;
  unit: string;
  unitLabelHi: string;
  unitLabelEn: string;
  purity: string | null;
  taxBasis: string;
  geoScope: GeoScope;
  slug: string;
  presentationDecimals: number;
};

export const CATEGORY_META: Record<RateCategory, CategoryMeta> = {
  petrol: {
    category: "petrol",
    group: "fuel",
    labelHi: "पेट्रोल",
    labelEn: "Petrol",
    unit: "litre",
    unitLabelHi: "प्रति लीटर",
    unitLabelEn: "per litre",
    purity: null,
    taxBasis: "retail_rsp_indicative",
    geoScope: "city",
    slug: "petrol-price-today",
    presentationDecimals: 2,
  },
  diesel: {
    category: "diesel",
    group: "fuel",
    labelHi: "डीजल",
    labelEn: "Diesel",
    unit: "litre",
    unitLabelHi: "प्रति लीटर",
    unitLabelEn: "per litre",
    purity: null,
    taxBasis: "retail_rsp_indicative",
    geoScope: "city",
    slug: "diesel-price-today",
    presentationDecimals: 2,
  },
  gold_24k: {
    category: "gold_24k",
    group: "bullion",
    labelHi: "सोना 24K",
    labelEn: "Gold 24K",
    unit: "10g",
    unitLabelHi: "प्रति 10 ग्राम",
    unitLabelEn: "per 10 grams",
    purity: "999",
    taxBasis: "ex_gst_benchmark",
    geoScope: "state",
    slug: "gold-price-today",
    presentationDecimals: 0,
  },
  gold_22k: {
    category: "gold_22k",
    group: "bullion",
    labelHi: "सोना 22K",
    labelEn: "Gold 22K",
    unit: "10g",
    unitLabelHi: "प्रति 10 ग्राम",
    unitLabelEn: "per 10 grams",
    purity: "916",
    taxBasis: "ex_gst_benchmark",
    geoScope: "state",
    slug: "gold-22k-price-today",
    presentationDecimals: 0,
  },
  silver_999: {
    category: "silver_999",
    group: "bullion",
    labelHi: "चांदी 999",
    labelEn: "Silver 999",
    unit: "kg",
    unitLabelHi: "प्रति किलोग्राम",
    unitLabelEn: "per kilogram",
    purity: "999",
    taxBasis: "ex_gst_benchmark",
    geoScope: "state",
    slug: "silver-price-today",
    presentationDecimals: 0,
  },
};

export function isRateCategory(value: string): value is RateCategory {
  return (RATE_CATEGORIES as readonly string[]).includes(value);
}

export function isFuelCitySlug(value: string): value is FuelCitySlug {
  return (FUEL_CITY_SLUGS as readonly string[]).includes(value);
}

export function getCategoryMeta(category: RateCategory): CategoryMeta {
  return CATEGORY_META[category];
}

export function buildLocation(opts: {
  category: RateCategory;
  citySlug?: string | null;
}): RateLocation | null {
  const meta = CATEGORY_META[opts.category];
  if (meta.group === "fuel") {
    if (!opts.citySlug || !isFuelCitySlug(opts.citySlug)) return null;
    const city = CITY_META[opts.citySlug];
    return {
      geoScope: "city",
      citySlug: opts.citySlug,
      cityNameHi: city.nameHi,
      cityNameEn: city.nameEn,
      stateCode: "CG",
      stateNameHi: "छत्तीसगढ़",
      stateNameEn: "Chhattisgarh",
      countryCode: "IN",
      honestyLabelHi: `${city.nameHi} — आउटलेट के अनुसार अंतर संभव`,
      honestyLabelEn: `${city.nameEn} — outlet variation possible`,
    };
  }

  // Bullion: never city-specific unless methodology supports it (it does not).
  return {
    geoScope: "state",
    citySlug: null,
    cityNameHi: null,
    cityNameEn: null,
    stateCode: "CG",
    stateNameHi: "छत्तीसगढ़",
    stateNameEn: "Chhattisgarh",
    countryCode: "IN",
    honestyLabelHi: "भारत/छत्तीसगढ़ संकेतात्मक बेंचमार्क — शहर-विशेष आधिकारिक दर नहीं",
    honestyLabelEn: "India/Chhattisgarh indicative benchmark — not a city-official jewellery MRP",
  };
}

export function seriesKeyFrom(opts: {
  category: RateCategory;
  citySlug?: string | null;
}): VerifiedRateSeriesKey | null {
  const meta = CATEGORY_META[opts.category];
  const location = buildLocation(opts);
  if (!location) return null;
  return {
    category: opts.category,
    geoScope: location.geoScope,
    citySlug: location.citySlug,
    stateCode: location.stateCode,
    countryCode: location.countryCode,
    purity: meta.purity,
    unit: meta.unit,
    taxBasis: meta.taxBasis,
  };
}

export function buildRecordKey(
  key: VerifiedRateSeriesKey,
  effectiveDate: string,
  sessionLabel: string | null
): string {
  const city = key.citySlug ?? "_";
  const purity = key.purity ?? "_";
  const session = sessionLabel ?? "day";
  return [
    key.category,
    key.geoScope,
    city,
    key.stateCode,
    key.countryCode,
    purity,
    key.unit,
    key.taxBasis,
    effectiveDate,
    session,
  ].join("|");
}

export type PublicRateRoute = {
  path: string;
  category: RateCategory;
  citySlug: string | null;
  indexable: boolean;
};

/** Supported indexable public routes (permanent useful hubs + detail pages). */
export function listSupportedRateRoutes(): PublicRateRoute[] {
  const routes: PublicRateRoute[] = [
    { path: "/rates", category: "petrol", citySlug: null, indexable: true },
    { path: "/rates/chhattisgarh", category: "petrol", citySlug: null, indexable: true },
    { path: "/rates/methodology", category: "petrol", citySlug: null, indexable: true },
    { path: "/rates/chhattisgarh/gold-price-today", category: "gold_24k", citySlug: null, indexable: true },
    { path: "/rates/chhattisgarh/gold-22k-price-today", category: "gold_22k", citySlug: null, indexable: true },
    { path: "/rates/chhattisgarh/silver-price-today", category: "silver_999", citySlug: null, indexable: true },
    { path: "/rates/chhattisgarh/dataset", category: "petrol", citySlug: null, indexable: true },
  ];

  for (const city of FUEL_CITY_SLUGS) {
    routes.push({
      path: `/rates/chhattisgarh/${city}/petrol-price-today`,
      category: "petrol",
      citySlug: city,
      indexable: true,
    });
    routes.push({
      path: `/rates/chhattisgarh/${city}/diesel-price-today`,
      category: "diesel",
      citySlug: city,
      indexable: true,
    });
  }
  return routes;
}

export function resolveFuelSlug(slug: string): RateCategory | null {
  if (slug === "petrol-price-today") return "petrol";
  if (slug === "diesel-price-today") return "diesel";
  return null;
}

export function districtHrefForCity(citySlug: FuelCitySlug): string {
  return `/district/${CITY_META[citySlug].districtSlug}`;
}

export function cityDisplay(citySlug: FuelCitySlug, lang: "hi" | "en" = "hi"): string {
  return lang === "hi" ? CITY_META[citySlug].nameHi : CITY_META[citySlug].nameEn;
}
