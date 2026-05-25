import type { PlatformSectionConfig } from "../content/types";

/** Homepage section toggles — admin-ready */
export const DEFAULT_SECTION_CONFIG: PlatformSectionConfig[] = [
  {
    key: "breaking",
    enabled: true,
    labelEn: "Breaking ticker",
    labelHi: "ब्रेकिंग टिकर",
  },
  {
    key: "district_wire",
    enabled: true,
    labelEn: "District Wire",
    labelHi: "जिला वायर",
  },
  {
    key: "global_brief",
    enabled: true,
    labelEn: "Global Brief",
    labelHi: "ग्लोबल ब्रीफ",
  },
  {
    key: "explore_topics",
    enabled: true,
    labelEn: "Explore Topics",
    labelHi: "विषय खोजें",
  },
  {
    key: "topic_hubs",
    enabled: true,
    labelEn: "Topic hubs",
    labelHi: "टॉपिक हब",
  },
];

export function isSectionEnabled(key: PlatformSectionConfig["key"]): boolean {
  return DEFAULT_SECTION_CONFIG.find((s) => s.key === key)?.enabled ?? true;
}
