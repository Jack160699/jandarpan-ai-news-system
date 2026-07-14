"use client";

import Link from "next/link";
import { CloudSun, Clock3 } from "lucide-react";
import { useClientNow } from "@/hooks/useClientNow";
import { useLanguage } from "@/providers/LanguageProvider";
import { usePlace } from "@/providers/PlaceProvider";

const IST = "Asia/Kolkata";

export function HeaderStatusStrip({ collapsed }: { collapsed: boolean }) {
  const { language } = useLanguage();
  const place = usePlace();
  const now = useClientNow(30_000);
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
  const weatherLabel = language === "en" ? "Weather" : "मौसम";

  return (
    <div className="jdp-topbar__status" aria-hidden={collapsed || undefined}>
      <time dateTime={now ? new Date(now).toISOString() : undefined}>{date}</time>
      <span className="jdp-topbar__status-time">
        <Clock3 size={12} aria-hidden />
        {time} IST
      </span>
      <Link href={`/search?q=${encodeURIComponent(`${place.name} weather`)}`}>
        <CloudSun size={13} aria-hidden />
        {weatherLabel}
      </Link>
    </div>
  );
}
