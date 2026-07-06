import type { AppLanguage } from "@/lib/i18n/types";
import { isGateLanguage } from "@/lib/i18n/gate-languages";

/** Map browser BCP-47 tag to reader language for gate UI + default highlight */
export function detectBrowserLanguage(): AppLanguage {
  if (typeof navigator === "undefined") return "hi";

  const tags = [
    navigator.language,
    ...(navigator.languages ?? []),
  ].filter(Boolean) as string[];

  for (const tag of tags) {
    const base = tag.toLowerCase().split("-")[0];
    if (base === "en") return "en";
    if (base === "hi") return "hi";
    if (base === "cg") return "cg";
  }

  return "cg";
}

/** Default highlight for onboarding when no saved preference */
export function resolveGateHighlightLanguage(
  stored: AppLanguage | null | undefined
): AppLanguage {
  if (stored && isGateLanguage(stored)) return stored;
  const detected = detectBrowserLanguage();
  if (isGateLanguage(detected)) return detected;
  return "cg";
}
