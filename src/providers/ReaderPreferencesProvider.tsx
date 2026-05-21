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
  type ReaderLanguage,
  type ReaderPreferences,
  type ReaderTheme,
  type ReadingMode,
} from "@/lib/reader-preferences";

type ReaderPreferencesContextValue = {
  prefs: ReaderPreferences;
  setLanguage: (language: ReaderLanguage) => void;
  confirmLanguage: (language: ReaderLanguage) => void;
  setTheme: (theme: ReaderTheme) => void;
  toggleTheme: () => void;
  setReadingMode: (mode: ReadingMode) => void;
  toggleReadingMode: () => void;
  setEdition: (edition: EditionChoice) => void;
  showLanguageGate: boolean;
  dismissLanguageGate: () => void;
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
    setPrefs(loaded);
    applyPreferencesToDocument(loaded);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.setAttribute(
        "content",
        prefs.theme === "dark" ? "#1e1c18" : "#f7f4ed"
      );
    }
  }, [prefs.theme, hydrated]);

  const update = useCallback((partial: Partial<ReaderPreferences>) => {
    setPrefs((prev) => {
      const next = { ...prev, ...partial };
      savePreferences(next);
      return next;
    });
  }, []);

  const setLanguage = useCallback(
    (language: ReaderLanguage) => update({ language }),
    [update]
  );

  const confirmLanguage = useCallback(
    (language: ReaderLanguage) =>
      update({ language, languageChosen: true }),
    [update]
  );

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

  const dismissLanguageGate = useCallback(() => {
    if (!prefs.languageChosen) {
      update({ languageChosen: true });
    }
  }, [prefs.languageChosen, update]);

  const value = useMemo(
    () => ({
      prefs,
      setLanguage,
      confirmLanguage,
      setTheme,
      toggleTheme,
      setReadingMode,
      toggleReadingMode,
      setEdition,
      showLanguageGate: hydrated && !prefs.languageChosen,
      dismissLanguageGate,
      searchOpen,
      setSearchOpen,
    }),
    [
      prefs,
      setLanguage,
      confirmLanguage,
      setTheme,
      toggleTheme,
      setReadingMode,
      toggleReadingMode,
      setEdition,
      hydrated,
      dismissLanguageGate,
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
