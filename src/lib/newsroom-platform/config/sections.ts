import type { PlatformSectionConfig } from "../content/types";
import { fetchPlatformConfig, isSectionEnabled as isSectionEnabledDb } from "@/lib/platform-admin/config";

/** @deprecated Use fetchPlatformConfig() */
export const DEFAULT_SECTION_CONFIG: PlatformSectionConfig[] = [];

export async function loadSectionConfig(): Promise<PlatformSectionConfig[]> {
  const config = await fetchPlatformConfig();
  return config?.homepageSections ?? [];
}

export async function isSectionEnabled(
  key: PlatformSectionConfig["key"]
): Promise<boolean> {
  return isSectionEnabledDb(key);
}
