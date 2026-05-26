import {
  HOMEPAGE_DISPLAY_KEYS,
  HOMEPAGE_SECTION_META,
  PLATFORM_SETTINGS_SECTIONS,
  type SettingsCardDef,
} from "@/lib/platform-admin/settings-schema";
import type { PlatformSectionConfig } from "@/lib/newsroom-platform/content/types";

export type SearchableSetting = {
  id: string;
  title: string;
  description: string;
  sectionId: string;
  sectionTitle: string;
  keywords: string[];
  kind: "homepage" | "setting";
};

export const ALL_SEARCHABLE_SETTINGS: SearchableSetting[] = [
  ...HOMEPAGE_DISPLAY_KEYS.map((key) => {
    const meta = HOMEPAGE_SECTION_META[key];
    return {
      id: key,
      title: meta.title,
      description: meta.description,
      sectionId: "homepage",
      sectionTitle: "Homepage Modules",
      keywords: [key, "homepage", meta.title],
      kind: "homepage" as const,
    };
  }),
  ...PLATFORM_SETTINGS_SECTIONS.flatMap((section) =>
    section.cards.map((card) => ({
      id: card.id,
      title: card.title,
      description: card.description,
      sectionId: section.id,
      sectionTitle: section.title,
      keywords: [card.id, section.id, section.title, card.title],
      kind: "setting" as const,
    }))
  ),
];

function scoreMatch(query: string, item: SearchableSetting): number {
  const q = query.trim().toLowerCase();
  if (!q) return 1;
  const hay = `${item.title} ${item.description} ${item.sectionTitle} ${item.keywords.join(" ")}`.toLowerCase();
  if (hay === q) return 100;
  if (item.title.toLowerCase() === q) return 90;
  if (item.title.toLowerCase().startsWith(q)) return 75;
  if (hay.includes(q)) return 55;
  let score = 0;
  for (const token of q.split(/\s+/).filter(Boolean)) {
    if (hay.includes(token)) score += 20;
  }
  return score;
}

export function fuzzyFilterSettings(
  query: string,
  items: SearchableSetting[] = ALL_SEARCHABLE_SETTINGS
): SearchableSetting[] {
  const q = query.trim();
  if (!q) return items;
  return items
    .map((item) => ({ item, score: scoreMatch(q, item) }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((r) => r.item);
}

export function cardMatchesSearch(
  card: Pick<SettingsCardDef, "title" | "description">,
  sectionTitle: string,
  query: string
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const hay = `${card.title} ${card.description} ${sectionTitle}`.toLowerCase();
  return q.split(/\s+/).every((t) => hay.includes(t));
}

export function homepageKeyMatchesSearch(
  key: PlatformSectionConfig["key"],
  query: string
): boolean {
  const meta = HOMEPAGE_SECTION_META[key];
  return cardMatchesSearch(meta, "Homepage Modules", query);
}
