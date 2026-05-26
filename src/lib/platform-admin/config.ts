import type { PlatformSectionConfig } from "@/lib/newsroom-platform/content/types";
import { createAdminServerClient, isSupabaseConfigured } from "@/lib/supabase";
import type { PlatformConfigBundle } from "./types";

const DEFAULT_SECTIONS: PlatformSectionConfig[] = [
  { key: "breaking", enabled: true, labelEn: "Breaking ticker", labelHi: "ब्रेकिंग टिकर" },
  { key: "district_wire", enabled: true, labelEn: "District Wire", labelHi: "जिला वायर" },
  { key: "global_brief", enabled: true, labelEn: "Global Brief", labelHi: "ग्लोबल ब्रीफ" },
  { key: "explore_topics", enabled: true, labelEn: "Explore Topics", labelHi: "विषय खोजें" },
  { key: "topic_hubs", enabled: true, labelEn: "Topic hubs", labelHi: "टॉपिक हब" },
];

export async function fetchPlatformConfig(): Promise<PlatformConfigBundle | null> {
  if (!isSupabaseConfigured()) return null;

  const supabase = createAdminServerClient();
  const { data, error } = await supabase
    .from("platform_config")
    .select("config_key, config_value")
    .in("config_key", ["homepage_sections", "newsroom_settings"]);

  if (error) {
    console.error("[platform-admin] config:", error.message);
    return null;
  }

  const map = new Map((data ?? []).map((r) => [r.config_key, r.config_value]));
  const sectionsRaw = map.get("homepage_sections");
  const homepageSections = Array.isArray(sectionsRaw)
    ? (sectionsRaw as PlatformSectionConfig[])
    : DEFAULT_SECTIONS;

  const settingsRaw = map.get("newsroom_settings");
  const newsroomSettings =
    settingsRaw && typeof settingsRaw === "object" && !Array.isArray(settingsRaw)
      ? (settingsRaw as Record<string, unknown>)
      : {};

  return { homepageSections, newsroomSettings };
}

export async function updatePlatformConfig(
  key: "homepage_sections" | "newsroom_settings",
  value: unknown
): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;

  const supabase = createAdminServerClient();
  const { error } = await supabase.from("platform_config").upsert(
    {
      config_key: key,
      config_value: value,
      updated_at: new Date().toISOString(),
    } as never,
    { onConflict: "config_key" }
  );

  if (error) {
    console.error("[platform-admin] update config:", error.message);
    return false;
  }
  return true;
}

export async function isSectionEnabled(key: PlatformSectionConfig["key"]): Promise<boolean> {
  const config = await fetchPlatformConfig();
  const sections = config?.homepageSections ?? DEFAULT_SECTIONS;
  return sections.find((s) => s.key === key)?.enabled ?? true;
}
