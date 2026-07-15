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

const DISTRICT_SELECTION_KEY = "jdp-district-selection-mode";

const ReaderPreferencesContext =
  createContext<ReaderPreferencesContextValue | null>(null);

export function ReaderPreferencesProvider({
  children,
  initialDistrict,
}: {
  children: React.ReactNode;
  initialDistrict?: string | null;
}) {
  // The server and the browser must paint the same first tree. Browser-only
  // preferences are merged immediately after hydration instead of inside the
  // state initializer, which previously forced React to replace the page.
  const initialPreferences = useMemo<ReaderPreferences>(
    () => ({
      ...DEFAULT_PREFERENCES,
      homeDistrict: initialDistrict ?? DEFAULT_PREFERENCES.homeDistrict,
    }),
    [initialDistrict]
  );
  const [prefs, setPrefs] = useState<ReaderPreferences>(initialPreferences);
  const [hydrated, setHydrated] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    const loaded = loadPreferences();
    const langState = loadStoredLanguage();
    const themePrefFromDom = document.documentElement.dataset
      .themePref as ReaderTheme | undefined;
    const merged = {
      ...loaded,
      // The SSR-readable cookie is authoritative for the first paint. It is
      // mirrored from local storage whenever a reader makes a selection.
      homeDistrict: initialDistrict ?? loaded.homeDistrict,
      theme: themePrefFromDom ?? loaded.theme,
      language: langState.language,
      languageChosen: langState.chosen,
    };
    applyPreferencesToDocument(merged);
    syncDistrictCookie(merged.homeDistrict);
    const id = window.setTimeout(() => {
      setPrefs(merged);
      setHydrated(true);
    }, 0);
    return () => window.clearTimeout(id);
  }, [initialDistrict]);

  useEffect(() => {
    if (!hydrated) return;

    let cancelled = false;
    const selectionMode = localStorage.getItem(DISTRICT_SELECTION_KEY);
    const stored = loadPreferences().homeDistrict?.trim().toLowerCase();

    // Preserve an existing non-default choice made before the selection marker
    // was introduced. Explicit choices always win over IP-derived defaults.
    if (!selectionMode && stored && stored !== "raipur") {
      localStorage.setItem(DISTRICT_SELECTION_KEY, "manual");
      return;
    }
    if (selectionMode === "manual") return;

    const resolveDistrict = async () => {
      try {
        const response = await fetch("/api/location", { cache: "no-store" });
        if (!response.ok) return;
        const data = (await response.json()) as { district?: string };
        const district = data.district?.trim().toLowerCase();
        if (!district || cancelled) return;
        setPrefs((prev) => {
          const next = { ...prev, homeDistrict: district };
          savePreferences(next);
          syncDistrictCookie(district);
          return next;
        });
        localStorage.setItem(DISTRICT_SELECTION_KEY, "auto");
      } catch {
        // The stable Raipur default remains available when location lookup fails.
      }
    };

    void resolveDistrict();
    return () => {
      cancelled = true;
    };
  }, [hydrated]);

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
    (homeDistrict: string | null) => {
      localStorage.setItem(DISTRICT_SELECTION_KEY, "manual");
      update({ homeDistrict });
    },
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
