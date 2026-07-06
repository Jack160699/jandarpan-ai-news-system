import { createAdminServerClient, isSupabaseConfigured } from "@/lib/supabase";
import { defaultOrganizationSettings } from "./defaults";
import type { OrganizationSettings } from "./types";

const CONFIG_KEY = "organization_settings";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

export function mergeOrganizationSettings(
  raw: unknown
): OrganizationSettings {
  const defaults = defaultOrganizationSettings();
  if (!isRecord(raw)) return defaults;

  const merged = { ...defaults };
  for (const key of Object.keys(defaults) as (keyof OrganizationSettings)[]) {
    const val = raw[key];
    if (typeof val === "string") merged[key] = val;
  }
  return merged;
}

export async function fetchOrganizationSettings(): Promise<OrganizationSettings> {
  const defaults = defaultOrganizationSettings();
  if (!isSupabaseConfigured()) return defaults;

  const supabase = createAdminServerClient();
  const { data, error } = await supabase
    .from("platform_config")
    .select("config_value")
    .eq("config_key", CONFIG_KEY)
    .maybeSingle();

  if (error) {
    console.error("[organization] fetch:", error.message);
    return defaults;
  }

  return mergeOrganizationSettings(data?.config_value);
}

export async function updateOrganizationSettings(
  value: OrganizationSettings
): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;

  const supabase = createAdminServerClient();
  const { error } = await supabase.from("platform_config").upsert(
    {
      config_key: CONFIG_KEY,
      config_value: value,
      category: "organization",
      description: "Publisher identity, contact, and social profiles",
      updated_at: new Date().toISOString(),
    } as never,
    { onConflict: "config_key" }
  );

  if (error) {
    console.error("[organization] update:", error.message);
    return false;
  }
  return true;
}
