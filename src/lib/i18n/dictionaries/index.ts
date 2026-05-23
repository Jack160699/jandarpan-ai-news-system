import type { AppLanguage, Dictionary } from "../types";
import { getLanguageConfig } from "@/lib/i18n/languages";
import { bn } from "./bn";
import { cg } from "./cg";
import { en } from "./en";
import { hi } from "./hi";
import { mr } from "./mr";
import { ta } from "./ta";

export const dictionaries: Record<AppLanguage, Dictionary> = {
  en,
  hi,
  cg,
  mr,
  bn,
  ta,
};

export function getDictionary(language: AppLanguage): Dictionary {
  return dictionaries[language] ?? dictionaries[getLanguageConfig(language).dictionaryFallback];
}

export { en, hi, cg, mr, bn, ta };
