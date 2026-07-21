/**
 * मेरा जिला dashboard data composition — only real available sources.
 * Hidden / controlled empty when data is unavailable. No fabricated values.
 */

import type { HomeArticle } from "@/lib/homepage/types";
import { getDistrict } from "@/lib/regional/districts";
import { composeMeraJila, type MeraJilaComposition } from "./mera-jila";

export type DashboardModuleId =
  | "lead_story"
  | "latest_local"
  | "nearby_news"
  | "civic_municipal"
  | "police_traffic"
  | "weather"
  | "mandi"
  | "fuel"
  | "power_tariff"
  | "water_notices"
  | "schools_colleges"
  | "jobs_recruitment"
  | "health_alerts"
  | "events"
  | "emergency_contacts";

export type DashboardModuleStatus = "ready" | "empty" | "unavailable";

export type DashboardModule<T = unknown> = {
  id: DashboardModuleId;
  status: DashboardModuleStatus;
  /** Hindi label for UI when rendered */
  labelHi: string;
  labelEn: string;
  data: T | null;
};

export type DistrictDashboardInput = {
  districtSlug: string;
  articles: HomeArticle[];
  /** Open-Meteo snapshot when fetched */
  weather?: {
    temperatureC?: number | null;
    weatherCode?: number | null;
    districtSlug?: string;
  } | null;
  /** AGMARKNET mandi rows when fetched */
  mandiRates?: Array<{ commodity: string; modalPrice: number }> | null;
  /** Verified fuel rates when available for this city/district */
  fuelRates?: Array<{ product: string; priceInr: number; asOf: string }> | null;
  /** Power/tariff — only pass when a real feed exists */
  powerInfo?: { summary: string; asOf: string } | null;
  waterNotices?: Array<{ title: string; asOf: string }> | null;
  emergencyContacts?: Array<{ name: string; phone: string }> | null;
  nowMs?: number;
};

export type DistrictDashboard = {
  districtSlug: string;
  districtName: string;
  districtNameHi: string;
  meraJila: MeraJilaComposition;
  modules: DashboardModule[];
  /** Modules safe to render (ready with data) */
  visibleModules: DashboardModule[];
};

const CIVIC_RE =
  /\b(municipal| नगर निगम|nagar nigam|collector|collectorate|सभापति|ward|drainage|सफाई)\b/i;
const POLICE_RE =
  /\b(police|traffic|पुलिस|यातायात|sp\b|dsp\b|थाना)\b/i;
const SCHOOL_RE =
  /\b(school|college|university|विद्यालय|कॉलेज|शिक्षा|exam)\b/i;
const JOBS_RE =
  /\b(recruitment|bharti|vacancy|भर्ती|नौकरी|job\s+fair)\b/i;
const HEALTH_RE =
  /\b(hospital|health|covid|dengue|स्वास्थ्य|अस्पताल|टीका)\b/i;
const EVENTS_RE =
  /\b(mela|fair|festival|event|मेला|उत्सव|कार्यक्रम)\b/i;

function filterByRe(articles: HomeArticle[], re: RegExp): HomeArticle[] {
  return articles.filter((a) => re.test(`${a.headline} ${a.summary}`));
}

function module<T>(
  id: DashboardModuleId,
  labelHi: string,
  labelEn: string,
  data: T | null | undefined,
  /** When true, empty array/null means hide rather than show empty shell */
  requireData = true
): DashboardModule<T> {
  if (data == null || (Array.isArray(data) && data.length === 0)) {
    return {
      id,
      status: requireData ? "unavailable" : "empty",
      labelHi,
      labelEn,
      data: null,
    };
  }
  return { id, status: "ready", labelHi, labelEn, data };
}

/**
 * Compose district dashboard from real inputs only.
 * Unavailable modules are status=unavailable and excluded from visibleModules.
 */
export function composeDistrictDashboard(
  input: DistrictDashboardInput
): DistrictDashboard {
  const district = getDistrict(input.districtSlug);
  const slug = district?.slug ?? input.districtSlug;
  const meraJila = composeMeraJila(input.articles, slug, {
    nowMs: input.nowMs,
  });

  const exactArticles = meraJila.exactStories.map((s) => s.article);
  const localPool =
    exactArticles.length > 0
      ? exactArticles
      : meraJila.feed.map((s) => s.article);

  const modules: DashboardModule[] = [
    module(
      "lead_story",
      "मुख्य खबर",
      "Lead story",
      meraJila.lead ? { item: meraJila.lead } : null
    ),
    module(
      "latest_local",
      "ताज़ा स्थानीय",
      "Latest local",
      meraJila.exactStories.length
        ? meraJila.exactStories.slice(0, 8)
        : null
    ),
    module(
      "nearby_news",
      "आसपास की खबरें",
      "Nearby news",
      meraJila.usedNearbyFallback && meraJila.nearbyStories.length
        ? meraJila.nearbyStories
        : null
    ),
    module(
      "civic_municipal",
      "नगर / प्रशासन",
      "Civic / municipal",
      filterByRe(localPool, CIVIC_RE).slice(0, 5)
    ),
    module(
      "police_traffic",
      "पुलिस / यातायात",
      "Police / traffic",
      filterByRe(localPool, POLICE_RE).slice(0, 5)
    ),
    module(
      "weather",
      "मौसम",
      "Weather",
      input.weather &&
        (input.weather.temperatureC != null ||
          input.weather.weatherCode != null)
        ? input.weather
        : null
    ),
    module(
      "mandi",
      "मंडी भाव",
      "Mandi rates",
      input.mandiRates && input.mandiRates.length > 0
        ? input.mandiRates.filter((r) => Number.isFinite(r.modalPrice))
        : null
    ),
    module(
      "fuel",
      "ईंधन",
      "Fuel",
      input.fuelRates &&
        input.fuelRates.length > 0 &&
        input.fuelRates.every((r) => Number.isFinite(r.priceInr) && r.priceInr > 0)
        ? input.fuelRates
        : null
    ),
    // Only when a real feed is supplied — never invent outages
    module(
      "power_tariff",
      "बिजली / टैरिफ",
      "Power / tariff",
      input.powerInfo?.summary ? input.powerInfo : null
    ),
    module(
      "water_notices",
      "पानी सूचना",
      "Water notices",
      input.waterNotices && input.waterNotices.length
        ? input.waterNotices
        : null
    ),
    module(
      "schools_colleges",
      "स्कूल / कॉलेज",
      "Schools / colleges",
      filterByRe(localPool, SCHOOL_RE).slice(0, 5)
    ),
    module(
      "jobs_recruitment",
      "नौकरी / भर्ती",
      "Jobs / recruitment",
      filterByRe(localPool, JOBS_RE).slice(0, 5)
    ),
    module(
      "health_alerts",
      "स्वास्थ्य",
      "Health alerts",
      filterByRe(localPool, HEALTH_RE).slice(0, 5)
    ),
    module(
      "events",
      "कार्यक्रम",
      "Events",
      filterByRe(localPool, EVENTS_RE).slice(0, 5)
    ),
    module(
      "emergency_contacts",
      "आपातकालीन संपर्क",
      "Emergency contacts",
      input.emergencyContacts && input.emergencyContacts.length
        ? input.emergencyContacts
        : null
    ),
  ];

  return {
    districtSlug: slug,
    districtName: district?.name ?? slug,
    districtNameHi: district?.nameHi ?? slug,
    meraJila,
    modules,
    visibleModules: modules.filter((m) => m.status === "ready"),
  };
}
