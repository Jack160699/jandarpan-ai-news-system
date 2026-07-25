/**
 * Time-of-day editorial dayparts for homepage tone (content only — no color redesign).
 * Uses Asia/Kolkata wall clock for Chhattisgarh readers.
 */

export type DayPart = "morning" | "midday" | "evening" | "night";

export type DayPartCopy = {
  dayPart: DayPart;
  /** Module eyebrow / tone label */
  toneHi: string;
  toneEn: string;
  /** आज का दर्पण subtitle */
  briefingTitleHi: string;
  briefingTitleEn: string;
};

const COPY: Record<DayPart, Omit<DayPartCopy, "dayPart">> = {
  morning: {
    toneHi: "आज सुबह",
    toneEn: "This morning",
    briefingTitleHi: "आज सुबह की जरूरी खबरें",
    briefingTitleEn: "Essential morning stories",
  },
  midday: {
    toneHi: "अब तक",
    toneEn: "So far today",
    briefingTitleHi: "अब तक क्या हुआ",
    briefingTitleEn: "What happened so far",
  },
  evening: {
    toneHi: "आज का सार",
    toneEn: "Today's wrap",
    briefingTitleHi: "आज दिनभर में क्या हुआ",
    briefingTitleEn: "What happened today",
  },
  night: {
    toneHi: "दिनभर की प्रमुख खबरें",
    toneEn: "Day's top stories",
    briefingTitleHi: "कल के लिए क्या जानें",
    briefingTitleEn: "What to know for tomorrow",
  },
};

/** Hour in Asia/Kolkata (0–23). */
export function kolkataHour(nowMs = Date.now()): number {
  try {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Kolkata",
      hour: "numeric",
      hour12: false,
    }).formatToParts(new Date(nowMs));
    const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "12");
    return Number.isFinite(hour) ? hour % 24 : 12;
  } catch {
    return new Date(nowMs).getHours();
  }
}

export function resolveDayPart(nowMs = Date.now()): DayPart {
  const h = kolkataHour(nowMs);
  if (h >= 5 && h < 11) return "morning";
  if (h >= 11 && h < 16) return "midday";
  if (h >= 16 && h < 21) return "evening";
  return "night";
}

export function getDayPartCopy(nowMs = Date.now()): DayPartCopy {
  const dayPart = resolveDayPart(nowMs);
  return { dayPart, ...COPY[dayPart] };
}

/** YYYY-MM-DD in Asia/Kolkata. */
export function kolkataDateKey(nowMs = Date.now()): string {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(nowMs));
  } catch {
    return new Date(nowMs).toISOString().slice(0, 10);
  }
}
