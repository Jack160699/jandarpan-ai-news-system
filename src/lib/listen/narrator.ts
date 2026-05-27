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
    desk: "जन दर्पण डेस्क",
    deskHi: "छत्तीसगढ़ ब्यूरो",
  },
  cg: {
    name: "Priya Sharma",
    nameHi: "प्रिया शर्मा",
    desk: "जन दर्पण डेस्क",
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
  ur: {
    name: "Ayesha Khan",
    nameHi: "عائشہ خان",
    desk: "Regional Bureau",
    deskHi: "علاقائی بیورو",
  },
};

export function getNarrator(language: NewsroomLanguage): NarratorProfile {
  return NARRATORS[language] ?? NARRATORS.hi;
}

/** Single-language narrator line for listen UI */
export function getNarratorDisplay(language: NewsroomLanguage): {
  name: string;
  desk: string;
  initial: string;
} {
  const n = getNarrator(language);
  if (language === "en") {
    return { name: n.name, desk: n.desk, initial: n.name.charAt(0) };
  }
  return { name: n.nameHi, desk: n.deskHi, initial: n.nameHi.charAt(0) };
}

export function formatDuration(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}
