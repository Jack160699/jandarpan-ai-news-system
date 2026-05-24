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
import { useRouter } from "next/navigation";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { normalizeAppLanguage } from "@/lib/i18n/safe-language";
import { resolveGateHighlightLanguage } from "@/lib/i18n/browser-language";
import { filterGateOptions } from "@/lib/i18n/gate-languages";
import {
  applyLanguageToDocument,
  loadStoredLanguage,
  lockLanguageGateDocument,
  saveStoredLanguage,
  unlockLanguageGateDocument,
} from "@/lib/i18n/storage";
import type { AppLanguage, Dictionary, LanguageOption } from "@/lib/i18n/types";
import type { NewsroomLanguage } from "@/lib/i18n/languages";
import { LANGUAGE_OPTIONS } from "@/lib/i18n/types";
import { PREFS_STORAGE_KEY } from "@/lib/reader-preferences";

type LanguageContextValue = {
  language: AppLanguage;
  t: Dictionary;
  ready: boolean;
  /** Gate visible — mandatory on every full page load / refresh */
  showLanguageGate: boolean;
  /** Main app chrome hidden until gate confirmed */
  contentLocked: boolean;
  languageOptions: LanguageOption[];
  gateLanguageOptions: LanguageOption[];
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

type LanguageProviderProps = {
  children: ReactNode;
  defaultLanguage?: NewsroomLanguage;
  enabledLanguages?: NewsroomLanguage[];
};

export function LanguageProvider({
  children,
  defaultLanguage = "hi",
  enabledLanguages,
}: LanguageProviderProps) {
  const router = useRouter();

  const languageOptions = useMemo(() => {
    if (!enabledLanguages?.length) return LANGUAGE_OPTIONS;
    const allowed = new Set(enabledLanguages);
    return LANGUAGE_OPTIONS.filter((o) => allowed.has(o.id as NewsroomLanguage));
  }, [enabledLanguages]);

  const gateLanguageOptions = useMemo(
    () => filterGateOptions(enabledLanguages),
    [enabledLanguages]
  );

  const [language, setLanguageState] = useState<AppLanguage>(defaultLanguage);
  const [ready, setReady] = useState(false);
  /** Resets on every full page load — gate required again after refresh */
  const [gateOpen, setGateOpen] = useState(true);

  useEffect(() => {
    lockLanguageGateDocument();
    const stored = loadStoredLanguage();
    const highlight = resolveGateHighlightLanguage(
      stored.chosen ? stored.language : null
    );
    setLanguageState(stored.chosen ? stored.language : highlight);
    applyLanguageToDocument(stored.chosen ? stored.language : highlight);
    syncReaderPrefsLanguage(
      stored.chosen ? stored.language : highlight,
      stored.chosen
    );
    setGateOpen(true);
    setReady(true);
  }, []);

  const persist = useCallback((lang: AppLanguage, hasChosen: boolean) => {
    setLanguageState(lang);
    saveStoredLanguage(lang, hasChosen);
    applyLanguageToDocument(lang);
    syncReaderPrefsLanguage(lang, hasChosen);
  }, []);

  const dismissGate = useCallback(() => {
    setGateOpen(false);
    unlockLanguageGateDocument();
  }, []);

  const setLanguage = useCallback(
    (lang: AppLanguage) => {
      persist(lang, true);
      dismissGate();
      router.refresh();
    },
    [persist, dismissGate, router]
  );

  const confirmLanguage = useCallback(
    (lang: AppLanguage) => {
      persist(lang, true);
      dismissGate();
      router.refresh();
    },
    [persist, dismissGate, router]
  );

  const safeLanguage = normalizeAppLanguage(language);
  const t = useMemo(() => getDictionary(safeLanguage), [safeLanguage]);

  const showLanguageGate = ready && gateOpen;
  const contentLocked = !ready || gateOpen;

  const value = useMemo(
    () => ({
      language,
      t,
      ready,
      showLanguageGate,
      contentLocked,
      languageOptions,
      gateLanguageOptions,
      setLanguage,
      confirmLanguage,
    }),
    [
      language,
      t,
      ready,
      showLanguageGate,
      contentLocked,
      languageOptions,
      gateLanguageOptions,
      setLanguage,
      confirmLanguage,
    ]
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

export function useTranslation() {
  return useLanguage();
}
