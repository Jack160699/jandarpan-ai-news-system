export type ReaderLanguage = "en" | "hi" | "cg";
export type ReaderTheme = "light" | "dark";
export type ReadingMode = "standard" | "comfort";
export type FontScale = "sm" | "base" | "lg" | "xl";
export type EditionChoice = "morning" | "afternoon" | "evening" | "late";

export type ReaderPreferences = {
  language: ReaderLanguage;
  theme: ReaderTheme;
  readingMode: ReadingMode;
  fontScale: FontScale;
  edition: EditionChoice;
  languageChosen: boolean;
};

export const PREFS_STORAGE_KEY = "cgb-reader-prefs";

export const DEFAULT_PREFERENCES: ReaderPreferences = {
  language: "hi",
  theme: "light",
  readingMode: "standard",
  fontScale: "base",
  edition: "morning",
  languageChosen: false,
};

export const LANGUAGE_OPTIONS: {
  id: ReaderLanguage;
  label: string;
  native: string;
}[] = [
  { id: "en", label: "English", native: "English" },
  { id: "hi", label: "Hindi", native: "हिन्दी" },
  { id: "cg", label: "Chhattisgarhi", native: "छत्तीसगढ़ी" },
];

export const EDITION_OPTIONS: { id: EditionChoice; label: string; hi: string }[] =
  [
    { id: "morning", label: "Morning", hi: "प्रातः" },
    { id: "afternoon", label: "Afternoon", hi: "दोपहर" },
    { id: "evening", label: "Evening", hi: "संध्या" },
    { id: "late", label: "Late desk", hi: "रात्रि" },
  ];

export function loadPreferences(): ReaderPreferences {
  if (typeof window === "undefined") return DEFAULT_PREFERENCES;
  try {
    const raw = localStorage.getItem(PREFS_STORAGE_KEY);
    if (!raw) return DEFAULT_PREFERENCES;
    return { ...DEFAULT_PREFERENCES, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

export function savePreferences(prefs: Partial<ReaderPreferences>) {
  if (typeof window === "undefined") return;
  const next = { ...loadPreferences(), ...prefs };
  localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(next));
  applyPreferencesToDocument(next);
}

export function applyPreferencesToDocument(prefs: ReaderPreferences) {
  const root = document.documentElement;
  root.setAttribute("data-theme", prefs.theme);
  root.setAttribute("data-reading-mode", prefs.readingMode);
  root.setAttribute("data-font-scale", prefs.fontScale ?? "base");
  root.setAttribute("data-language", prefs.language);
  root.lang = prefs.language === "en" ? "en" : "hi";
}

export function getThemeColor(theme: ReaderTheme): string {
  return theme === "dark" ? "#121212" : "#ffffff";
}
