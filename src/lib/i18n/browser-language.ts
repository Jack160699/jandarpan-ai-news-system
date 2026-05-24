import type { AppLanguage } from "@/lib/i18n/types";
import { isGateLanguage } from "@/lib/i18n/gate-languages";

/** Map browser BCP-47 tag to newsroom language for gate UI + default highlight */
export function detectBrowserLanguage(): AppLanguage {
  if (typeof navigator === "undefined") return "en";

  const tags = [
    navigator.language,
    ...(navigator.languages ?? []),
  ].filter(Boolean) as string[];

  for (const tag of tags) {
    const base = tag.toLowerCase().split("-")[0];
    if (base === "en") return "en";
    if (base === "hi") return "hi";
    if (base === "bn") return "bn";
    if (base === "mr") return "mr";
    if (base === "ta") return "ta";
    if (base === "cg") return "cg";
  }

  return "en";
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
