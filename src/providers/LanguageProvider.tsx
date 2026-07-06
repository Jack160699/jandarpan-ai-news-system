"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { traceStability } from "@/lib/observability/stability-trace";
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
import { filterReaderLanguages } from "@/lib/i18n/reader-languages";
import type { AppLanguage, Dictionary, LanguageOption } from "@/lib/i18n/types";
import type { NewsroomLanguage } from "@/lib/i18n/languages";
import { PREFS_STORAGE_KEY } from "@/lib/reader-preferences";

type LanguageContextValue = {
  language: AppLanguage;
  t: Dictionary;
  ready: boolean;
  mounted: boolean;
  showLanguageGate: boolean;
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
  const pathname = usePathname() ?? "/";
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const languageOptions = useMemo(
    () => filterReaderLanguages(enabledLanguages),
    [enabledLanguages]
  );

  const gateLanguageOptions = useMemo(
    () => filterGateOptions(enabledLanguages),
    [enabledLanguages]
  );

  const [language, setLanguageState] = useState<AppLanguage>(defaultLanguage);
  const [ready, setReady] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [gateOpen, setGateOpen] = useState(true);

  useEffect(() => {
    setMounted(true);
    const stored = loadStoredLanguage();
    const highlight = resolveGateHighlightLanguage(
      stored.chosen ? stored.language : null
    );
    const initial = stored.chosen ? stored.language : highlight;
    const safe = normalizeAppLanguage(initial);

    setLanguageState(safe);
    applyLanguageToDocument(safe);
    syncReaderPrefsLanguage(safe, stored.chosen);

    if (stored.chosen) {
      setGateOpen(false);
      unlockLanguageGateDocument();
    } else {
      setGateOpen(true);
      lockLanguageGateDocument();
    }

    setReady(true);

    if (process.env.NODE_ENV !== "production") {
      console.debug("[Language] hydrated", {
        language: safe,
        chosen: stored.chosen,
        gateOpen: !stored.chosen,
      });
    }
  }, []);

  useEffect(() => {
    return () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    };
  }, []);

  const persist = useCallback((lang: AppLanguage, hasChosen: boolean) => {
    const safe = normalizeAppLanguage(lang);
    setLanguageState(safe);
    saveStoredLanguage(safe, hasChosen);
    applyLanguageToDocument(safe);
    syncReaderPrefsLanguage(safe, hasChosen);
    return safe;
  }, []);

  const dismissGate = useCallback(() => {
    setGateOpen(false);
    unlockLanguageGateDocument();
  }, []);

  /** Background server refresh — never blocks first paint after Continue */
  const scheduleServerRefresh = useCallback(() => {
    if (pathname.startsWith("/admin") || pathname.startsWith("/dashboard")) {
      return;
    }
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    refreshTimerRef.current = setTimeout(() => {
      traceStability("ROUTER_REFRESH", "language_change_refresh", { pathname });
      router.refresh();
    }, 400);
  }, [router, pathname]);

  const setLanguage = useCallback(
    (lang: AppLanguage) => {
      persist(lang, true);
      dismissGate();
      scheduleServerRefresh();
    },
    [persist, dismissGate, scheduleServerRefresh]
  );

  const confirmLanguage = useCallback(
    (lang: AppLanguage) => {
      const safe = persist(lang, true);
      dismissGate();
      if (process.env.NODE_ENV !== "production") {
        console.debug("[Language] confirmLanguage", { selected: safe });
      }
      scheduleServerRefresh();
    },
    [persist, dismissGate, scheduleServerRefresh]
  );

  const safeLanguage = normalizeAppLanguage(language);
  const t = useMemo(() => getDictionary(safeLanguage), [safeLanguage]);

  const showLanguageGate = mounted && ready && gateOpen;
  const contentLocked = !mounted || !ready || gateOpen;

  const value = useMemo(
    () => ({
      language: safeLanguage,
      t,
      ready,
      mounted,
      showLanguageGate,
      contentLocked,
      languageOptions,
      gateLanguageOptions,
      setLanguage,
      confirmLanguage,
    }),
    [
      safeLanguage,
      t,
      ready,
      mounted,
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
