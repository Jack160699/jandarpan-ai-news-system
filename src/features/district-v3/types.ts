import type { HomeArticle } from "@/lib/homepage/types";
import type { DistrictPriorityTier } from "@/lib/regional/districts";

export type DistrictListItem = {
  id: string;
  title: string;
  summary?: string;
  meta?: string;
  href?: string;
};

export type DistrictWeather = {
  location: string;
  condition: string;
  temperatureC: number;
  highC: number;
  lowC: number;
  humidity?: number;
  placeholder?: boolean;
};

export type DistrictStat = {
  id: string;
  label: string;
  value: string;
  trend?: "up" | "down" | "neutral";
  meta?: string;
};

export type DistrictTimelineEvent = {
  id: string;
  label: string;
  detail: string;
  timestamp?: string;
};

export type DistrictV3Data = {
  stats: DistrictStat[];
  government: DistrictListItem[];
  weather: DistrictWeather;
  traffic: DistrictListItem[];
  jobs: DistrictListItem[];
  events: DistrictListItem[];
  crime: DistrictListItem[];
  business: DistrictListItem[];
  timeline: DistrictTimelineEvent[];
};

export type DistrictInfo = {
  slug: string;
  name: string;
  nameHi: string;
  priority: DistrictPriorityTier;
};

export type DistrictExperienceV3Props = {
  district: DistrictInfo;
  articles: HomeArticle[];
  /** Optional placeholder data overrides */
  data?: Partial<DistrictV3Data>;
  /** Simulate initial load for skeleton demo */
  simulateLoadMs?: number;
};
