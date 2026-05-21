import type { AppLanguage } from "./types";
import { PREFS_STORAGE_KEY } from "@/lib/reader-preferences";

export const LANGUAGE_STORAGE_KEY = "cgb-language";
export const LANGUAGE_CHOSEN_KEY = "cgb-language-chosen";

const VALID: AppLanguage[] = ["en", "hi", "cg"];

export function isAppLanguage(value: string | null | undefined): value is AppLanguage {
  return VALID.includes(value as AppLanguage);
}

export type StoredLanguageState = {
  language: AppLanguage;
  chosen: boolean;
};

export function loadStoredLanguage(): StoredLanguageState {
  if (typeof window === "undefined") {
    return { language: "hi", chosen: false };
  }

  try {
    const rawLang = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    const chosenFlag = localStorage.getItem(LANGUAGE_CHOSEN_KEY);

    if (rawLang && isAppLanguage(rawLang)) {
      return {
        language: rawLang,
        chosen: chosenFlag === "1",
      };
    }

    const migrated = migrateFromReaderPrefs();
    if (migrated) return migrated;
  } catch {
    /* ignore */
  }

  return { language: "hi", chosen: false };
}

function migrateFromReaderPrefs(): StoredLanguageState | null {
  try {
    const raw = localStorage.getItem(PREFS_STORAGE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as {
      language?: string;
      languageChosen?: boolean;
    };
    if (!isAppLanguage(p.language)) return null;
    const state = {
      language: p.language,
      chosen: p.languageChosen === true,
    };
    saveStoredLanguage(state.language, state.chosen);
    return state;
  } catch {
    return null;
  }
}

export function saveStoredLanguage(language: AppLanguage, chosen: boolean) {
  if (typeof window === "undefined") return;
  localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  localStorage.setItem(LANGUAGE_CHOSEN_KEY, chosen ? "1" : "0");
}

export function applyLanguageToDocument(language: AppLanguage) {
  const root = document.documentElement;
  root.setAttribute("data-language", language);
  root.lang = language === "en" ? "en" : "hi";
}
