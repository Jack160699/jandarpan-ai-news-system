/**
 * Newsroom language registry — Indian regional audiences
 */

export const NEWSROOM_LANGUAGES = [
  "hi",
  "en",
  "cg",
  "mr",
  "bn",
  "ta",
] as const;

export type NewsroomLanguage = (typeof NEWSROOM_LANGUAGES)[number];

export type LanguageScript = "devanagari" | "latin" | "bengali" | "tamil";

export type LanguageConfig = {
  id: NewsroomLanguage;
  label: string;
  native: string;
  shortCode: string;
  bcp47: string;
  ogLocale: string;
  hreflang: string;
  script: LanguageScript;
  /** CSS data-script value for typography */
  scriptAttr: LanguageScript;
  fontFamily: string;
  lineHeight: number;
  letterSpacing: string;
  /** UI dictionary fallback when full dict not shipped */
  dictionaryFallback: NewsroomLanguage;
  isIndic: boolean;
};

export const LANGUAGE_CONFIG: Record<NewsroomLanguage, LanguageConfig> = {
  hi: {
    id: "hi",
    label: "Hindi",
    native: "हिन्दी",
    shortCode: "हि",
    bcp47: "hi-IN",
    ogLocale: "hi_IN",
    hreflang: "hi",
    script: "devanagari",
    scriptAttr: "devanagari",
    fontFamily: "var(--font-hindi), var(--font-body), serif",
    lineHeight: 1.72,
    letterSpacing: "0.01em",
    dictionaryFallback: "hi",
    isIndic: true,
  },
  en: {
    id: "en",
    label: "English",
    native: "English",
    shortCode: "EN",
    bcp47: "en-IN",
    ogLocale: "en_IN",
    hreflang: "en",
    script: "latin",
    scriptAttr: "latin",
    fontFamily: "var(--font-body), Georgia, serif",
    lineHeight: 1.65,
    letterSpacing: "0",
    dictionaryFallback: "en",
    isIndic: false,
  },
  cg: {
    id: "cg",
    label: "Chhattisgarhi",
    native: "छत्तीसगढ़ी",
    shortCode: "च्",
    bcp47: "hi-IN",
    ogLocale: "hi_IN",
    hreflang: "hi-CG",
    script: "devanagari",
    scriptAttr: "devanagari",
    fontFamily: "var(--font-hindi), var(--font-body), serif",
    lineHeight: 1.74,
    letterSpacing: "0.012em",
    dictionaryFallback: "hi",
    isIndic: true,
  },
  mr: {
    id: "mr",
    label: "Marathi",
    native: "मराठी",
    shortCode: "म",
    bcp47: "mr-IN",
    ogLocale: "mr_IN",
    hreflang: "mr",
    script: "devanagari",
    scriptAttr: "devanagari",
    fontFamily: "var(--font-hindi), var(--font-body), serif",
    lineHeight: 1.72,
    letterSpacing: "0.01em",
    dictionaryFallback: "hi",
    isIndic: true,
  },
  bn: {
    id: "bn",
    label: "Bengali",
    native: "বাংলা",
    shortCode: "বা",
    bcp47: "bn-IN",
    ogLocale: "bn_IN",
    hreflang: "bn",
    script: "bengali",
    scriptAttr: "bengali",
    fontFamily: "var(--font-bengali), var(--font-body), serif",
    lineHeight: 1.78,
    letterSpacing: "0.005em",
    dictionaryFallback: "hi",
    isIndic: true,
  },
  ta: {
    id: "ta",
    label: "Tamil",
    native: "தமிழ்",
    shortCode: "த",
    bcp47: "ta-IN",
    ogLocale: "ta_IN",
    hreflang: "ta",
    script: "tamil",
    scriptAttr: "tamil",
    fontFamily: "var(--font-tamil), var(--font-body), serif",
    lineHeight: 1.8,
    letterSpacing: "0.01em",
    dictionaryFallback: "hi",
    isIndic: true,
  },
};

export type LanguageOption = {
  id: NewsroomLanguage;
  label: string;
  native: string;
  shortCode: string;
};

export const LANGUAGE_OPTIONS: LanguageOption[] = NEWSROOM_LANGUAGES.map(
  (id) => LANGUAGE_CONFIG[id]
).map((c) => ({
  id: c.id,
  label: c.label,
  native: c.native,
  shortCode: c.shortCode,
}));

export function isNewsroomLanguage(
  value: string | null | undefined
): value is NewsroomLanguage {
  return NEWSROOM_LANGUAGES.includes(value as NewsroomLanguage);
}

export function getLanguageConfig(lang: NewsroomLanguage): LanguageConfig {
  return LANGUAGE_CONFIG[lang];
}

export function normalizeArticleLanguage(
  raw: string | null | undefined
): NewsroomLanguage {
  const v = raw?.toLowerCase().trim();
  if (v === "en" || v === "english") return "en";
  if (v === "cg" || v === "chhattisgarhi") return "cg";
  if (v === "mr" || v === "marathi") return "mr";
  if (v === "bn" || v === "bengali" || v === "bangla") return "bn";
  if (v === "ta" || v === "tamil") return "ta";
  return "hi";
}

export function readingTimeLabel(minutes: number, lang: NewsroomLanguage): string {
  const m = Math.max(1, minutes);
  const labels: Record<NewsroomLanguage, string> = {
    hi: `${m} मिनट`,
    en: `${m} min read`,
    cg: `${m} मिनट`,
    mr: `${m} मिनिटे`,
    bn: `${m} মিনিট`,
    ta: `${m} நிமிடம்`,
  };
  return labels[lang];
}
