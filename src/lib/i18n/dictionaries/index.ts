import type { AppLanguage, Dictionary } from "../types";
import { cg } from "./cg";
import { en } from "./en";
import { hi } from "./hi";

export const dictionaries: Partial<Record<AppLanguage, Dictionary>> & {
  en: Dictionary;
  hi: Dictionary;
  cg: Dictionary;
} = {
  en,
  hi,
  cg,
};

import { getLanguageConfig } from "@/lib/i18n/languages";

export function getDictionary(language: AppLanguage): Dictionary {
  const direct = dictionaries[language as keyof typeof dictionaries];
  if (direct) return direct;
  const fallback = getLanguageConfig(language).dictionaryFallback;
  return dictionaries[fallback] ?? dictionaries.hi;
}
