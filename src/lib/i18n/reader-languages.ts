import { LANGUAGE_CONFIG, type NewsroomLanguage } from "@/lib/i18n/languages";
import type { LanguageOption } from "@/lib/i18n/types";

/** Reader-facing languages — Hindi-first product, English optional */
export const READER_LANGUAGE_IDS = [
  "hi",
  "en",
] as const satisfies readonly NewsroomLanguage[];

export type ReaderLanguage = (typeof READER_LANGUAGE_IDS)[number];

export function isReaderLanguage(
  value: string | null | undefined
): value is ReaderLanguage {
  return (READER_LANGUAGE_IDS as readonly string[]).includes(value ?? "");
}

export const READER_LANGUAGE_OPTIONS: LanguageOption[] = READER_LANGUAGE_IDS.map(
  (id) => {
    const c = LANGUAGE_CONFIG[id];
    return {
      id: c.id,
      label: c.label,
      native: c.native,
      shortCode: c.shortCode,
    };
  }
);

export function toReaderLanguage(
  value: string | null | undefined,
  fallback: ReaderLanguage = "hi"
): ReaderLanguage {
  if (isReaderLanguage(value)) return value;
  return fallback;
}

export function filterReaderLanguages(
  enabled?: NewsroomLanguage[]
): LanguageOption[] {
  if (!enabled?.length) return READER_LANGUAGE_OPTIONS;
  const allowed = new Set(enabled);
  return READER_LANGUAGE_OPTIONS.filter((o) => allowed.has(o.id));
}
