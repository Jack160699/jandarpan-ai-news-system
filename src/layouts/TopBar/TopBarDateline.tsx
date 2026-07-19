"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { MapPin } from "lucide-react";
import { getIntlLocale } from "@/lib/i18n/format";
import { getDistrict } from "@/lib/regional/districts";
import { useLanguage } from "@/providers/LanguageProvider";
import { useNavigation } from "@/providers/NavigationProvider";
import { useReaderPreferences } from "@/providers/ReaderPreferencesProvider";

const IST = "Asia/Kolkata";
const WEATHER_TTL_MS = 30 * 60 * 1000;

type WeatherState = {
  tempC: number;
  conditionHi: string;
  conditionEn: string;
};

type WeatherCacheEntry = WeatherState & { at: number };

function readWeatherCache(district: string): WeatherState | null {
  try {
    const raw = sessionStorage.getItem(`jd-weather-${district}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as WeatherCacheEntry;
    if (Date.now() - parsed.at > WEATHER_TTL_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeWeatherCache(district: string, state: WeatherState) {
  try {
    sessionStorage.setItem(
      `jd-weather-${district}`,
      JSON.stringify({ ...state, at: Date.now() } satisfies WeatherCacheEntry)
    );
  } catch {
    /* ignore */
  }
}

/**
 * Compact date · time · district · weather block for the header middle area.
 * Hydration-safe: clock and weather render only after mount.
 */
export function TopBarDateline() {
  const { language } = useLanguage();
  const { prefs } = useReaderPreferences();
  const { startNavigation } = useNavigation();

  const [now, setNow] = useState<Date | null>(null);
  const [weather, setWeather] = useState<WeatherState | null>(null);

  const districtSlug = prefs.homeDistrict ?? "raipur";
  const district = getDistrict(districtSlug) ?? getDistrict("raipur");
  const districtName =
    language === "en" ? district?.name ?? "Raipur" : district?.nameHi ?? "रायपुर";
  const districtHref = `/district/${district?.slug ?? "raipur"}`;

  // Minute-aligned clock, mounted-only to stay hydration-safe
  useEffect(() => {
    setNow(new Date());
    const tick = () => setNow(new Date());
    const msToNextMinute = 60000 - (Date.now() % 60000);
    let interval: ReturnType<typeof setInterval> | null = null;
    const align = setTimeout(() => {
      tick();
      interval = setInterval(tick, 60000);
    }, msToNextMinute);
    return () => {
      clearTimeout(align);
      if (interval) clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const slug = district?.slug ?? "raipur";
    const cached = readWeatherCache(slug);
    if (cached) {
      setWeather(cached);
      return;
    }
    fetch(`/api/weather?district=${slug}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data?.ok) return;
        const state: WeatherState = {
          tempC: data.tempC,
          conditionHi: data.conditionHi,
          conditionEn: data.conditionEn,
        };
        writeWeatherCache(slug, state);
        setWeather(state);
      })
      .catch(() => {
        /* weather is optional — hide on failure */
      });
    return () => {
      cancelled = true;
    };
  }, [district?.slug]);

  const locale = getIntlLocale(language);

  const dateLabel = useMemo(() => {
    if (!now) return "";
    return new Intl.DateTimeFormat(locale, {
      weekday: "short",
      day: "numeric",
      month: "short",
      timeZone: IST,
    }).format(now);
  }, [now, locale]);

  const timeLabel = useMemo(() => {
    if (!now) return "";
    return new Intl.DateTimeFormat(locale, {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZone: IST,
    }).format(now);
  }, [now, locale]);

  return (
    <Link
      href={districtHref}
      className="jdp-topbar__dateline"
      onClick={() => startNavigation(districtHref)}
      aria-label={
        language === "en"
          ? `${districtName} district page`
          : `${districtName} ज़िला पेज`
      }
    >
      <span className="jdp-topbar__dateline-row jdp-topbar__dateline-row--date">
        {dateLabel || " "}
      </span>
      <span className="jdp-topbar__dateline-row jdp-topbar__dateline-row--meta">
        {timeLabel ? <span suppressHydrationWarning>{timeLabel}</span> : null}
        <span className="jdp-topbar__dateline-district">
          <MapPin size={11} aria-hidden />
          {districtName}
        </span>
        {weather ? (
          <span className="jdp-topbar__dateline-temp">{weather.tempC}°</span>
        ) : null}
      </span>
    </Link>
  );
}
