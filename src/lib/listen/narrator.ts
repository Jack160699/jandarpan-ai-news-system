import type { NewsroomLanguage } from "@/lib/i18n/languages";

export type NarratorProfile = {
  name: string;
  nameHi: string;
  desk: string;
  deskHi: string;
};

const NARRATORS: Record<NewsroomLanguage, NarratorProfile> = {
  hi: {
    name: "Priya Sharma",
    nameHi: "प्रिया शर्मा",
    desk: "हमार छत्तीसगढ़ डेस्क",
    deskHi: "छत्तीसगढ़ ब्यूरो",
  },
  cg: {
    name: "Priya Sharma",
    nameHi: "प्रिया शर्मा",
    desk: "हमार छत्तीसगढ़ डेस्क",
    deskHi: "छत्तीसगढ़ ब्यूरो",
  },
  en: {
    name: "Arjun Mehta",
    nameHi: "अर्जुन मेहता",
    desk: "State Desk",
    deskHi: "राज्य डेस्क",
  },
  mr: {
    name: "Priya Sharma",
    nameHi: "प्रिया शर्मा",
    desk: "Regional Bureau",
    deskHi: "क्षेत्रीय ब्यूरो",
  },
  bn: {
    name: "Ananya Das",
    nameHi: "अनन्या दास",
    desk: "Regional Bureau",
    deskHi: "क्षेत्रीय ब्यूरो",
  },
  ta: {
    name: "Kavya R.",
    nameHi: "काव्या",
    desk: "Regional Bureau",
    deskHi: "क्षेत्रीय ब्यूरो",
  },
};

export function getNarrator(language: NewsroomLanguage): NarratorProfile {
  return NARRATORS[language] ?? NARRATORS.hi;
}

export function formatDuration(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}
