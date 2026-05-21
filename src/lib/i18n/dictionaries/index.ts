import type { AppLanguage, Dictionary } from "../types";
import { cg } from "./cg";
import { en } from "./en";
import { hi } from "./hi";

export const dictionaries: Record<AppLanguage, Dictionary> = {
  en,
  hi,
  cg,
};

export function getDictionary(language: AppLanguage): Dictionary {
  return dictionaries[language] ?? dictionaries.hi;
}
