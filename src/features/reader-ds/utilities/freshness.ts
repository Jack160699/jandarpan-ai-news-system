import { MANDI_MAX_AGE_DAYS } from "./types";

/** Parse AGMARKNET arrival_date (`DD/MM/YYYY` or ISO-like) → UTC midnight of that calendar day. */
export function parseMandiReportedDate(raw: string | null | undefined): Date | null {
  if (!raw?.trim()) return null;
  const s = raw.trim();
  const dmy = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (dmy) {
    const dd = Number(dmy[1]);
    const mm = Number(dmy[2]);
    const yyyy = Number(dmy[3]);
    if (!yyyy || mm < 1 || mm > 12 || dd < 1 || dd > 31) return null;
    return new Date(Date.UTC(yyyy, mm - 1, dd));
  }
  const iso = Date.parse(s);
  if (!Number.isFinite(iso)) return null;
  const d = new Date(iso);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/** Calendar days between reported (UTC date) and "today" in Asia/Kolkata. */
export function mandiAgeDays(reportedAt: string, now = new Date()): number | null {
  const reported = parseMandiReportedDate(reportedAt);
  if (!reported) return null;
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const todayParts = fmt.format(now); // YYYY-MM-DD
  const [y, m, d] = todayParts.split("-").map(Number);
  const todayUtc = Date.UTC(y, m - 1, d);
  const diff = Math.floor((todayUtc - reported.getTime()) / 86_400_000);
  return diff;
}

export function classifyMandiFreshness(
  reportedAt: string,
  now = new Date()
): "current" | "recent" | "stale" | "invalid" {
  const age = mandiAgeDays(reportedAt, now);
  if (age == null || age < 0) return "invalid";
  if (age <= 1) return "current";
  if (age <= MANDI_MAX_AGE_DAYS) return "recent";
  return "stale";
}

export function formatMandiReportLabel(
  reportedAt: string,
  locale: "hi" | "en"
): string {
  const d = parseMandiReportedDate(reportedAt);
  if (!d) return reportedAt;
  return new Intl.DateTimeFormat(locale === "en" ? "en-IN" : "hi-IN", {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(d);
}
