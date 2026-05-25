"use client";

import { useEffect, useMemo, useState } from "react";
import { Clock3, MapPin } from "lucide-react";
import { useMenuBriefing } from "@/hooks/useMenuBriefing";
import { pickBilingualLabel } from "@/lib/i18n/pick-label";
import { useLanguage } from "@/providers/LanguageProvider";
import { useLiveNewsroomOptional } from "@/providers/LiveNewsroomProvider";
import { SuperMenuBlock } from "./SuperMenuBlock";

const IST = "Asia/Kolkata";

type SuperMenuTodayLiveProps = {
  menuOpen: boolean;
};

function formatIstTime(language: string) {
  const locale = language === "en" ? "en-IN" : "hi-IN";
  const now = new Date();
  const time = new Intl.DateTimeFormat(locale, {
    timeZone: IST,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(now);
  const day = new Intl.DateTimeFormat(locale, {
    timeZone: IST,
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(now);
  return { time, day };
}

export function SuperMenuTodayLive({ menuOpen }: SuperMenuTodayLiveProps) {
  const { language, t } = useLanguage();
  const live = useLiveNewsroomOptional();
  const open = menuOpen;

  const liveBriefing = useMemo(() => {
    if (!live?.feed) return null;
    const breaking = live.feed.breakingTicker?.[0]?.headline ?? null;
    const alert = live.feed.localBreakingAlerts?.[0];
    const localAlert = alert
      ? alert.district
        ? `${alert.district}: ${alert.headline}`
        : alert.headline
      : null;
    return { breakingHeadline: breaking, localAlert };
  }, [live?.feed]);

  const briefing = useMenuBriefing(open, liveBriefing);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!open) return;
    const id = window.setInterval(() => setTick((n) => n + 1), 60_000);
    return () => window.clearInterval(id);
  }, [open]);

  const { time, day } = useMemo(
    () => formatIstTime(language),
    [language, tick]
  );

  const breaking =
    briefing.breakingHeadline?.trim() ||
    t.footer.todayLive.defaultBreaking;
  const local =
    briefing.localAlert?.trim() || t.footer.todayLive.defaultLocal;

  return (
    <SuperMenuBlock
      id="sm-today-live"
      title={t.footer.todayLive.title}
    >
      <div className="sm-today">
        <div className="sm-today__row">
          <span className="sm-today__live">
            <span className="sm-today__dot" aria-hidden />
            {t.footer.todayLive.liveBadge}
          </span>
          <span className="sm-today__time">
            <Clock3 size={14} strokeWidth={2} aria-hidden />
            {time}
          </span>
        </div>
        <p className="sm-today__day">{day}</p>
        <p className="sm-today__headline">{breaking}</p>
        <p className="sm-today__alert">
          <MapPin size={14} strokeWidth={2} aria-hidden />
          <span>{local}</span>
        </p>
        <p className="sm-today__tz">
          {pickBilingualLabel(language, "India Standard Time", "भारतीय मानक समय")}
        </p>
      </div>
    </SuperMenuBlock>
  );
}
