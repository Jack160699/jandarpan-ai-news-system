"use client";

import { useEffect, useState } from "react";
import { weatherIconName } from "@/lib/weather/codes";
import { WEATHER_MAX_AGE_MS } from "@/lib/weather/types";

export type ClientWeatherView = {
  status: "loading" | "ok" | "unavailable";
  tempC: number | null;
  conditionHi: string | null;
  conditionEn: string | null;
  icon: "sun" | "rain";
  source: string | null;
  fetchedAt: string | null;
  districtSlug: string;
};

type CacheEntry = {
  tempC: number;
  conditionHi: string;
  conditionEn: string;
  weatherCode: number | null;
  isDay: boolean | null;
  source: string;
  fetchedAt: string;
  at: number;
};

function cacheKey(slug: string) {
  return `jd-a1-weather-${slug}`;
}

function readCache(slug: string): CacheEntry | null {
  try {
    const raw = sessionStorage.getItem(cacheKey(slug));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheEntry;
    if (!parsed || typeof parsed.tempC !== "number" || !Number.isFinite(parsed.tempC)) return null;
    if (typeof parsed.at !== "number" || Date.now() - parsed.at > WEATHER_MAX_AGE_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCache(slug: string, entry: Omit<CacheEntry, "at">) {
  try {
    sessionStorage.setItem(cacheKey(slug), JSON.stringify({ ...entry, at: Date.now() }));
  } catch {
    /* ignore quota */
  }
}

function toView(slug: string, entry: CacheEntry): ClientWeatherView {
  return {
    status: "ok",
    tempC: entry.tempC,
    conditionHi: entry.conditionHi,
    conditionEn: entry.conditionEn,
    icon: weatherIconName(entry.weatherCode, entry.isDay),
    source: entry.source,
    fetchedAt: entry.fetchedAt,
    districtSlug: slug,
  };
}

const UNAVAILABLE = (slug: string): ClientWeatherView => ({
  status: "unavailable",
  tempC: null,
  conditionHi: null,
  conditionEn: null,
  icon: "rain",
  source: null,
  fetchedAt: null,
  districtSlug: slug,
});

/** In-flight dedupe — DeskChrome + UtilityRow both mount on homepage. */
const inflight = new Map<string, Promise<CacheEntry | null>>();

function fetchWeather(slug: string): Promise<CacheEntry | null> {
  const existing = inflight.get(slug);
  if (existing) return existing;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);

  const req = fetch(`/api/weather?district=${encodeURIComponent(slug)}`, {
    signal: controller.signal,
  })
    .then(async (res) => {
      if (!res.ok) return null;
      return res.json() as Promise<Record<string, unknown>>;
    })
    .then((data) => {
      if (
        !data ||
        data.ok !== true ||
        typeof data.tempC !== "number" ||
        !Number.isFinite(data.tempC) ||
        typeof data.conditionHi !== "string" ||
        typeof data.conditionEn !== "string"
      ) {
        return null;
      }
      const entry: CacheEntry = {
        tempC: Math.round(data.tempC),
        conditionHi: data.conditionHi,
        conditionEn: data.conditionEn,
        weatherCode: typeof data.weatherCode === "number" ? data.weatherCode : null,
        isDay: typeof data.isDay === "boolean" ? data.isDay : null,
        source: typeof data.source === "string" ? data.source : "open-meteo",
        fetchedAt: typeof data.fetchedAt === "string" ? data.fetchedAt : new Date().toISOString(),
        at: Date.now(),
      };
      writeCache(slug, {
        tempC: entry.tempC,
        conditionHi: entry.conditionHi,
        conditionEn: entry.conditionEn,
        weatherCode: entry.weatherCode,
        isDay: entry.isDay,
        source: entry.source,
        fetchedAt: entry.fetchedAt,
      });
      return entry;
    })
    .catch(() => null)
    .finally(() => {
      clearTimeout(timeout);
      inflight.delete(slug);
    });

  inflight.set(slug, req);
  return req;
}

/**
 * Client weather for A1 UtilityRow — Open-Meteo via `/api/weather`.
 * Never invents temperatures; rejects stale session cache beyond WEATHER_MAX_AGE_MS.
 * Pass `null` to disable fetching (tests / explicit temp override).
 */
export function useDistrictWeather(districtSlug: string | null | undefined): ClientWeatherView {
  const enabled = districtSlug != null;
  const slug = (districtSlug?.trim() || "raipur");
  const [view, setView] = useState<ClientWeatherView>(() => ({
    status: enabled ? "loading" : "unavailable",
    tempC: null,
    conditionHi: null,
    conditionEn: null,
    icon: "rain",
    source: null,
    fetchedAt: null,
    districtSlug: slug,
  }));

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    const cached = readCache(slug);
    if (cached) {
      // Defer so we don't sync-setState in the effect body (eslint react-hooks).
      queueMicrotask(() => {
        if (!cancelled) setView(toView(slug, cached));
      });
      return () => {
        cancelled = true;
      };
    }

    queueMicrotask(() => {
      if (cancelled) return;
      setView({
        status: "loading",
        tempC: null,
        conditionHi: null,
        conditionEn: null,
        icon: "rain",
        source: null,
        fetchedAt: null,
        districtSlug: slug,
      });
    });

    fetchWeather(slug).then((entry) => {
      if (cancelled) return;
      if (!entry) {
        setView(UNAVAILABLE(slug));
        return;
      }
      setView(toView(slug, entry));
    });

    return () => {
      cancelled = true;
    };
  }, [slug, enabled]);

  if (!enabled) return UNAVAILABLE(slug);
  return view;
}
