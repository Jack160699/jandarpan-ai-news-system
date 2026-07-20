/**
 * Asia/Kolkata (IST) calendar-day bounds as UTC ISO strings.
 */

const IST_TZ = "Asia/Kolkata";

export type IstDayBounds = {
  /** YYYY-MM-DD in Asia/Kolkata */
  day: string;
  /** Inclusive start of IST day as UTC ISO */
  startIso: string;
  /** Exclusive end of IST day as UTC ISO */
  endIso: string;
};

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/**
 * Format a Date as YYYY-MM-DD in Asia/Kolkata.
 */
export function formatIstDay(date: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: IST_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const y = parts.find((p) => p.type === "year")?.value ?? "1970";
  const m = parts.find((p) => p.type === "month")?.value ?? "01";
  const d = parts.find((p) => p.type === "day")?.value ?? "01";
  return `${y}-${m}-${d}`;
}

/**
 * Convert an IST calendar date + wall-clock time to a UTC Date.
 * Uses a fixed +05:30 offset (IST has no DST).
 */
export function istWallTimeToUtcDate(
  day: string,
  hour: number,
  minute = 0,
  second = 0,
  ms = 0
): Date {
  const [y, m, d] = day.split("-").map(Number);
  // IST = UTC+5:30 → UTC = IST - 5:30
  const utcMs = Date.UTC(y, m - 1, d, hour - 5, minute - 30, second, ms);
  return new Date(utcMs);
}

/**
 * Inclusive start / exclusive end of the Asia/Kolkata calendar day
 * containing `now` (or an explicit IST day string YYYY-MM-DD).
 */
export function getIstDayBounds(
  now: Date | string = new Date()
): IstDayBounds {
  const day = typeof now === "string" ? now : formatIstDay(now);
  const start = istWallTimeToUtcDate(day, 0, 0, 0, 0);
  // Next IST midnight
  const [y, m, d] = day.split("-").map(Number);
  const nextLocal = new Date(Date.UTC(y, m - 1, d + 1));
  const nextDay = `${nextLocal.getUTCFullYear()}-${pad2(nextLocal.getUTCMonth() + 1)}-${pad2(nextLocal.getUTCDate())}`;
  const end = istWallTimeToUtcDate(nextDay, 0, 0, 0, 0);

  return {
    day,
    startIso: start.toISOString(),
    endIso: end.toISOString(),
  };
}
