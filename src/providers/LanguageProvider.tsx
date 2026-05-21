"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { getDictionary } from "@/lib/i18n/dictionaries";
import {
  applyLanguageToDocument,
  loadStoredLanguage,
  saveStoredLanguage,
} from "@/lib/i18n/storage";
import type { AppLanguage, Dictionary, LanguageOption } from "@/lib/i18n/types";
import { LANGUAGE_OPTIONS } from "@/lib/i18n/types";
import { PREFS_STORAGE_KEY } from "@/lib/reader-preferences";

type LanguageContextValue = {
  language: AppLanguage;
  t: Dictionary;
  ready: boolean;
  showLanguageGate: boolean;
  languageOptions: LanguageOption[];
  setLanguage: (language: AppLanguage) => void;
  confirmLanguage: (language: AppLanguage) => void;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

function syncReaderPrefsLanguage(language: AppLanguage, chosen: boolean) {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(PREFS_STORAGE_KEY);
    const base = raw ? JSON.parse(raw) : {};
    localStorage.setItem(
      PREFS_STORAGE_KEY,
      JSON.stringify({
        ...base,
        language,
        languageChosen: chosen,
      })
    );
  } catch {
    /* ignore */
  }
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<AppLanguage>("hi");
  const [chosen, setChosen] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = loadStoredLanguage();
    setLanguageState(stored.language);
    setChosen(stored.chosen);
    applyLanguageToDocument(stored.language);
    syncReaderPrefsLanguage(stored.language, stored.chosen);
    setReady(true);
  }, []);

  const persist = useCallback((lang: AppLanguage, hasChosen: boolean) => {
    setLanguageState(lang);
    setChosen(hasChosen);
    saveStoredLanguage(lang, hasChosen);
    applyLanguageToDocument(lang);
    syncReaderPrefsLanguage(lang, hasChosen);
  }, []);

  const setLanguage = useCallback(
    (lang: AppLanguage) => {
      persist(lang, true);
    },
    [persist]
  );

  const confirmLanguage = useCallback(
    (lang: AppLanguage) => {
      persist(lang, true);
    },
    [persist]
  );

  const t = useMemo(() => getDictionary(language), [language]);

  const value = useMemo(
    () => ({
      language,
      t,
      ready,
      showLanguageGate: ready && !chosen,
      languageOptions: LANGUAGE_OPTIONS,
      setLanguage,
      confirmLanguage,
    }),
    [language, t, ready, chosen, setLanguage, confirmLanguage]
  );

  return (
    <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error("useLanguage must be used within LanguageProvider");
  }
  return ctx;
}

export function useLanguageOptional() {
  return useContext(LanguageContext);
}

/** Re-export for components that only need the translator */
export function useTranslation() {
  return useLanguage();
}
