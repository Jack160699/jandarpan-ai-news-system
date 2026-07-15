"use client";

import { CloudSun } from "lucide-react";
import { useEffect, useState } from "react";
import { useClientNow } from "@/hooks/useClientNow";
import { useLanguage } from "@/providers/LanguageProvider";
import { usePlace } from "@/providers/PlaceProvider";

const IST = "Asia/Kolkata";

export function HeaderStatusStrip() {
  const { language } = useLanguage();
  const place = usePlace();
  const now = useClientNow(30_000);
  const [temperature, setTemperature] = useState<string>("--°");
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
          setTemperature(`${Math.round(data.temperature)}°`);
        }
      } catch {
        // Fixed-width placeholder keeps the header stable while offline.
      }
    };
    void load();
    return () => controller.abort();
  }, [place.id]);

  return (
    <div className="jdp-topbar__status">
      <time dateTime={now ? new Date(now).toISOString() : undefined}>{date}</time>
      <span className="jdp-topbar__status-time">
        {time}
      </span>
      <span className="jdp-topbar__weather" aria-label={language === "en" ? "Weather" : "मौसम"}>
        <CloudSun size={13} aria-hidden />
        {temperature}
      </span>
    </div>
  );
}
