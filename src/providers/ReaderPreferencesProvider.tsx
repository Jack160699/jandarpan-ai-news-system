"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  applyPreferencesToDocument,
  DEFAULT_PREFERENCES,
  getThemeColor,
  loadPreferences,
  savePreferences,
  type EditionChoice,
  type ReaderPreferences,
  type FontScale,
  type ReaderTheme,
  type ReadingMode,
} from "@/lib/reader-preferences";
import { syncDistrictCookie } from "@/lib/personalization/cookies";
import {
  LANGUAGE_STORAGE_KEY,
  loadStoredLanguage,
} from "@/lib/i18n/storage";
import type { ReaderLanguage } from "@/lib/reader-preferences";

type ReaderPreferencesContextValue = {
  prefs: ReaderPreferences;
  setTheme: (theme: ReaderTheme) => void;
  toggleTheme: () => void;
  setReadingMode: (mode: ReadingMode) => void;
  toggleReadingMode: () => void;
  setEdition: (edition: EditionChoice) => void;
  setFontScale: (scale: FontScale) => void;
  cycleFontScale: () => void;
  setHomeDistrict: (slug: string | null) => void;
  searchOpen: boolean;
  setSearchOpen: (open: boolean) => void;
};

const ReaderPreferencesContext =
  createContext<ReaderPreferencesContextValue | null>(null);

function readInitialPrefs(): ReaderPreferences {
  if (typeof window === "undefined") return DEFAULT_PREFERENCES;
  const loaded = loadPreferences();
  const langState = loadStoredLanguage();
  const themePrefFromDom = document.documentElement.dataset
    .themePref as ReaderTheme | undefined;
  return {
    ...loaded,
    theme: themePrefFromDom ?? loaded.theme,
    language: langState.language,
    languageChosen: langState.chosen,
  };
}

export function ReaderPreferencesProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [prefs, setPrefs] = useState<ReaderPreferences>(readInitialPrefs);
  const [hydrated, setHydrated] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    const loaded = loadPreferences();
    const langState = loadStoredLanguage();
    const merged = {
      ...loaded,
      language: langState.language,
      languageChosen: langState.chosen,
    };
    setPrefs(merged);
    applyPreferencesToDocument(merged);
    syncDistrictCookie(merged.homeDistrict);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.setAttribute("content", getThemeColor(prefs.theme));
    }
  }, [prefs.theme, hydrated]);

  useEffect(() => {
    if (!hydrated || prefs.theme !== "system") return;
    const colorQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const contrastQuery = window.matchMedia("(prefers-contrast: more)");
    const reapply = () => applyPreferencesToDocument(prefs);
    colorQuery.addEventListener("change", reapply);
    contrastQuery.addEventListener("change", reapply);
    return () => {
      colorQuery.removeEventListener("change", reapply);
      contrastQuery.removeEventListener("change", reapply);
    };
  }, [hydrated, prefs]);

  useEffect(() => {
    if (!hydrated) return;
    const onStorage = (e: StorageEvent) => {
      if (e.key === LANGUAGE_STORAGE_KEY && e.newValue) {
        const lang = e.newValue as ReaderLanguage;
        setPrefs((prev) => ({ ...prev, language: lang }));
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [hydrated]);

  const update = useCallback((partial: Partial<ReaderPreferences>) => {
    setPrefs((prev) => {
      const next = { ...prev, ...partial };
      savePreferences(next);
      if ("homeDistrict" in partial) {
        syncDistrictCookie(next.homeDistrict);
      }
      return next;
    });
  }, []);

  const setTheme = useCallback(
    (theme: ReaderTheme) => update({ theme }),
    [update]
  );

  const toggleTheme = useCallback(
    () =>
      update({ theme: prefs.theme === "light" ? "dark" : "light" }),
    [update, prefs.theme]
  );

  const setReadingMode = useCallback(
    (readingMode: ReadingMode) => update({ readingMode }),
    [update]
  );

  const toggleReadingMode = useCallback(
    () =>
      update({
        readingMode:
          prefs.readingMode === "standard" ? "comfort" : "standard",
      }),
    [update, prefs.readingMode]
  );

  const setEdition = useCallback(
    (edition: EditionChoice) => update({ edition }),
    [update]
  );

  const setFontScale = useCallback(
    (fontScale: FontScale) => update({ fontScale }),
    [update]
  );

  const cycleFontScale = useCallback(() => {
    const order: FontScale[] = ["sm", "base", "lg", "xl"];
    const idx = order.indexOf(prefs.fontScale ?? "base");
    const next = order[(idx + 1) % order.length];
    update({ fontScale: next });
  }, [update, prefs.fontScale]);

  const setHomeDistrict = useCallback(
    (homeDistrict: string | null) => update({ homeDistrict }),
    [update]
  );

  const value = useMemo(
    () => ({
      prefs,
      setTheme,
      toggleTheme,
      setReadingMode,
      toggleReadingMode,
      setEdition,
      setFontScale,
      cycleFontScale,
      setHomeDistrict,
      searchOpen,
      setSearchOpen,
    }),
    [
      prefs,
      setTheme,
      toggleTheme,
      setReadingMode,
      toggleReadingMode,
      setEdition,
      setFontScale,
      cycleFontScale,
      setHomeDistrict,
      searchOpen,
    ]
  );

  return (
    <ReaderPreferencesContext.Provider value={value}>
      {children}
    </ReaderPreferencesContext.Provider>
  );
}

export function useReaderPreferences() {
  const ctx = useContext(ReaderPreferencesContext);
  if (!ctx) {
    throw new Error(
      "useReaderPreferences must be used within ReaderPreferencesProvider"
    );
  }
  return ctx;
}

export function useReaderPreferencesOptional() {
  return useContext(ReaderPreferencesContext);
}
