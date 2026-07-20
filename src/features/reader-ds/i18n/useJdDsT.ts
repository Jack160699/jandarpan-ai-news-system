"use client";

import { useCallback, useMemo } from "react";
import { useLanguage } from "@/providers/LanguageProvider";
import {
  jdDsT,
  toJdDsLocale,
  type JdDsLocale,
  type JdDsStringKey,
} from "./strings";

/**
 * Reader-DS chrome translator. Uses LanguageProvider locale (cookie-seeded SSR)
 * so first paint matches server; Hindi is fallback for missing keys.
 */
export function useJdDsT() {
  const { language } = useLanguage();
  const locale: JdDsLocale = toJdDsLocale(language);

  const t = useCallback(
    (key: JdDsStringKey, vars?: Record<string, string | number>) =>
      jdDsT(locale, key, vars),
    [locale]
  );

  return useMemo(() => ({ t, locale, isEnglish: locale === "en" }), [t, locale]);
}
