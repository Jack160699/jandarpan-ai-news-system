/**
 * Localized homepage section / category labels
 */

import type { Dictionary } from "@/lib/i18n/types";
import type { HomeSectionId } from "@/lib/homepage/types";
import type { NewsroomLanguage } from "@/lib/i18n/languages";

export function getSectionLabel(
  section: HomeSectionId | string,
  t: Dictionary,
  _lang?: NewsroomLanguage
): string {
  const key = section as keyof Dictionary["home"]["categories"];
  const fromDict = t.home.categories[key];
  if (fromDict) return fromDict;
  return section;
}
