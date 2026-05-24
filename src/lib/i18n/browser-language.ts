import type { AppLanguage } from "@/lib/i18n/types";
import { isNewsroomLanguage } from "@/lib/i18n/languages";

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
    if (base === "ur") return "ur";
  }

  return "en";
}

export function resolveGateHighlightLanguage(
  stored: AppLanguage | null | undefined
): AppLanguage {
  if (stored && isNewsroomLanguage(stored)) return stored;
  return detectBrowserLanguage();
}
