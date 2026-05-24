import { LANGUAGE_CONFIG, type NewsroomLanguage } from "@/lib/i18n/languages";
import type { LanguageOption } from "@/lib/i18n/types";

/** Languages shown in the mandatory gate (initial product set) */
export const GATE_LANGUAGE_IDS = [
  "en",
  "hi",
  "bn",
  "mr",
  "ta",
  "ur",
] as const satisfies readonly NewsroomLanguage[];

export type GateLanguageId = (typeof GATE_LANGUAGE_IDS)[number];

export const GATE_LANGUAGE_OPTIONS: LanguageOption[] = GATE_LANGUAGE_IDS.map(
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

export function filterGateOptions(
  enabled?: NewsroomLanguage[]
): LanguageOption[] {
  if (!enabled?.length) return GATE_LANGUAGE_OPTIONS;
  const allowed = new Set(enabled);
  return GATE_LANGUAGE_OPTIONS.filter((o) => allowed.has(o.id));
}
