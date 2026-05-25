"use client";

import { useEffect, useMemo, useState } from "react";
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
  return new Intl.DateTimeFormat(locale, {
    timeZone: IST,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date());
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

  const time = useMemo(() => formatIstTime(language), [language, tick]);

  const breaking =
    briefing.breakingHeadline?.trim() ||
    t.footer.todayLive.defaultBreaking;
  const local =
    briefing.localAlert?.trim() || t.footer.todayLive.defaultLocal;

  return (
    <SuperMenuBlock
      id="sm-today-live"
      title={t.footer.todayLive.title}
      className="sm-block--tight"
    >
      <div className="sm-today-v2">
        <div className="sm-today-v2__meta">
          <span className="sm-today-v2__live">
            <span className="sm-today-v2__dot" aria-hidden />
            {t.footer.todayLive.liveBadge}
          </span>
          <time className="sm-today-v2__time">{time}</time>
        </div>
        <p className="sm-today-v2__headline">{breaking}</p>
        <p className="sm-today-v2__alert">{local}</p>
      </div>
    </SuperMenuBlock>
  );
}
