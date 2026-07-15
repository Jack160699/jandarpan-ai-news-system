"use client";

import { CloudSun, MapPin } from "lucide-react";
import { useEffect, useState } from "react";
import { useClientNow } from "@/hooks/useClientNow";
import { useLanguage } from "@/providers/LanguageProvider";
import { usePlace } from "@/providers/PlaceProvider";

const IST = "Asia/Kolkata";

export function HeaderStatusStrip() {
  const { language } = useLanguage();
  const place = usePlace();
  const now = useClientNow(30_000);
  const [weather, setWeather] = useState<{ district: string; temperature: number } | null>(null);
  const temperature = weather?.district === place.id ? weather.temperature : null;
  const locale = language === "en" ? "en-IN" : "hi-IN";
  const date = now
    ? new Intl.DateTimeFormat(locale, {
        timeZone: IST,
        weekday: "short",
        day: "numeric",
        month: "short",
      }).format(now)
    : "—";
  const time = now
    ? new Intl.DateTimeFormat(locale, {
        timeZone: IST,
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      }).format(now)
    : "—";

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      try {
        const response = await fetch(`/api/weather?district=${encodeURIComponent(place.id)}`, {
          signal: controller.signal,
        });
        if (!response.ok) return;
        const data = (await response.json()) as { temperature?: number };
        if (typeof data.temperature === "number") {
          setWeather({ district: place.id, temperature: Math.round(data.temperature) });
        }
      } catch {
        // Weather is optional; the rest of the utility strip remains stable.
      }
    };
    void load();
    return () => controller.abort();
  }, [place.id]);

  return (
    <div className="jdp-topbar__status">
      <time dateTime={now ? new Date(now).toISOString() : undefined}>{date}</time>
      <span className="jdp-topbar__status-separator" aria-hidden>•</span>
      <span className="jdp-topbar__status-time">{time}</span>
      <span className="jdp-topbar__status-separator" aria-hidden>•</span>
      <span className="jdp-topbar__weather" aria-label={language === "en" ? "Local weather" : "स्थानीय मौसम"}>
        <MapPin size={12} aria-hidden />
        <span>{place.shortName}</span>
        <CloudSun size={13} aria-hidden />
        {temperature === null ? (
          <span
            className="jdp-topbar__weather-loading"
            aria-label={language === "en" ? "Weather loading" : "मौसम लोड हो रहा है"}
          />
        ) : (
          <span>{temperature}°</span>
        )}
      </span>
    </div>
  );
}
