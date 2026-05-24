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
  loadPreferences,
  savePreferences,
  type EditionChoice,
  type ReaderPreferences,
  type FontScale,
  type ReaderTheme,
  type ReadingMode,
} from "@/lib/reader-preferences";
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

export function ReaderPreferencesProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [prefs, setPrefs] = useState<ReaderPreferences>(DEFAULT_PREFERENCES);
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
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.setAttribute(
        "content",
        prefs.theme === "dark" ? "#050505" : "#f8f8f8"
      );
    }
  }, [prefs.theme, hydrated]);

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
