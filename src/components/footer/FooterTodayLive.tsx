"use client";

import { useEffect, useMemo, useState } from "react";
import { Clock3, MapPin } from "lucide-react";
import { useLanguage } from "@/providers/LanguageProvider";

const IST_TIMEZONE = "Asia/Kolkata";

type FooterTodayLiveProps = {
  breakingHeadline?: string | null;
  localInfo?: string | null;
};

function formatIstNow(now: Date, language: string) {
  const locale = language === "en" ? "en-IN" : "hi-IN";
  const dateLine = new Intl.DateTimeFormat(locale, {
    timeZone: IST_TIMEZONE,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(now);

  const timeLine = new Intl.DateTimeFormat(locale, {
    timeZone: IST_TIMEZONE,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(now);

  const dayLine = new Intl.DateTimeFormat(locale, {
    timeZone: IST_TIMEZONE,
    weekday: "long",
  }).format(now);

  return { dateLine, timeLine, dayLine };
}

export function FooterTodayLive({
  breakingHeadline,
  localInfo,
}: FooterTodayLiveProps) {
  const { t, language } = useLanguage();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const tick = () => setNow(new Date());
    tick();
    const id = window.setInterval(tick, 30_000);
    return () => window.clearInterval(id);
  }, []);

  const { dateLine, timeLine, dayLine } = useMemo(
    () => formatIstNow(now, language),
    [now, language]
  );

  const breaking =
    breakingHeadline?.trim() || t.footer.todayLive.defaultBreaking;
  const local = localInfo?.trim() || t.footer.todayLive.defaultLocal;

  return (
    <section
      className="jd-footer-today"
      aria-labelledby="footer-today-live"
    >
      <div className="jd-footer-today__panel">
        <div className="jd-footer-today__head">
          <h2 id="footer-today-live" className="jd-footer-today__title">
            {t.footer.todayLive.title}
          </h2>
          <span className="jd-footer-today__badge" aria-label={t.footer.todayLive.liveBadge}>
            <span className="jd-footer-today__dot" aria-hidden />
            {t.footer.todayLive.liveBadge}
          </span>
        </div>

        <div className="jd-footer-today__meta">
          <p className="jd-footer-today__date">{dateLine}</p>
          <p className="jd-footer-today__day">{dayLine}</p>
          <p className="jd-footer-today__time">
            <Clock3 className="jd-footer-today__icon" aria-hidden strokeWidth={2} />
            <span>
              {timeLine} {t.footer.todayLive.timezone}
            </span>
          </p>
        </div>

        <p className="jd-footer-today__breaking">{breaking}</p>

        <p className="jd-footer-today__local">
          <MapPin className="jd-footer-today__icon" aria-hidden strokeWidth={2} />
          <span>{local}</span>
        </p>
      </div>
    </section>
  );
}
