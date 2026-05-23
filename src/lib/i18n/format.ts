/**
 * Localized dates and relative time — Unicode-safe Intl
 */

import {
  getLanguageConfig,
  type NewsroomLanguage,
} from "@/lib/i18n/languages";

const IST = "Asia/Kolkata";

export function getIntlLocale(lang: NewsroomLanguage): string {
  return getLanguageConfig(lang).bcp47;
}

export function formatNewsDate(
  iso: string,
  lang: NewsroomLanguage,
  style: "short" | "medium" | "long" = "medium"
): string {
  try {
    const opts: Intl.DateTimeFormatOptions = {
      timeZone: IST,
      ...(style === "short"
        ? { day: "numeric", month: "short" }
        : style === "long"
          ? {
              weekday: "short",
              day: "numeric",
              month: "long",
              year: "numeric",
            }
          : {
              day: "numeric",
              month: "short",
              year: "numeric",
            }),
    };
    return new Intl.DateTimeFormat(getIntlLocale(lang), opts).format(
      new Date(iso)
    );
  } catch {
    return "";
  }
}

export function formatNewsTime(iso: string, lang: NewsroomLanguage): string {
  try {
    return new Intl.DateTimeFormat(getIntlLocale(lang), {
      hour: "numeric",
      minute: "2-digit",
      hour12: lang === "en",
      timeZone: IST,
    }).format(new Date(iso));
  } catch {
    return "";
  }
}

export function formatNewsDateTime(iso: string, lang: NewsroomLanguage): string {
  return `${formatNewsDate(iso, lang, "medium")} · ${formatNewsTime(iso, lang)}`;
}

const RELATIVE_UNITS: Record<
  NewsroomLanguage,
  { now: string; min: string; hr: string; day: string }
> = {
  en: { now: "Just now", min: "min ago", hr: "hr ago", day: "d ago" },
  hi: { now: "अभी", min: "मिनट पहले", hr: "घंटे पहले", day: "दिन पहले" },
  cg: { now: "अभी", min: "मिनट पहिले", hr: "घंटा पहिले", day: "दिन पहिले" },
  mr: { now: "आत्ता", min: "मिनिटांपूर्वी", hr: "तासापूर्वी", day: "दिवसापूर्वी" },
  bn: { now: "এইমাত্র", min: "মিনিট আগে", hr: "ঘণ্টা আগে", day: "দিন আগে" },
  ta: { now: "இப்போது", min: "நிமிடம் முன்", hr: "மணி நேரம் முன்", day: "நாள் முன்" },
};

export function formatRelativeTime(
  iso: string | null,
  lang: NewsroomLanguage
): string {
  if (!iso) return RELATIVE_UNITS[lang].now;
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60_000);
  const u = RELATIVE_UNITS[lang];
  if (mins < 1) return u.now;
  if (mins < 60) return `${mins} ${u.min}`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} ${u.hr}`;
  const days = Math.floor(hrs / 24);
  return `${days} ${u.day}`;
}
