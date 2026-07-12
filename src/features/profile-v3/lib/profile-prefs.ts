import type { ProfileV3Prefs } from "../types";

export const PROFILE_V3_PREFS_KEY = "cgb-profile-v3-prefs";

export const DEFAULT_PROFILE_V3_PREFS: ProfileV3Prefs = {
  aiSummaryEnabled: true,
  aiAssistantEnabled: true,
  aiVoiceEnabled: false,
  breakingAlerts: true,
  liveDeskAlerts: true,
  morningBriefAlerts: false,
  analyticsOptOut: false,
  showReadingHistory: true,
  personalizedFeed: true,
};

export function loadProfileV3Prefs(): ProfileV3Prefs {
  if (typeof window === "undefined") return DEFAULT_PROFILE_V3_PREFS;
  try {
    const raw = localStorage.getItem(PROFILE_V3_PREFS_KEY);
    if (!raw) return DEFAULT_PROFILE_V3_PREFS;
    return { ...DEFAULT_PROFILE_V3_PREFS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_PROFILE_V3_PREFS;
  }
}

export function saveProfileV3Prefs(partial: Partial<ProfileV3Prefs>): ProfileV3Prefs {
  if (typeof window === "undefined") return DEFAULT_PROFILE_V3_PREFS;
  const next = { ...loadProfileV3Prefs(), ...partial };
  localStorage.setItem(PROFILE_V3_PREFS_KEY, JSON.stringify(next));
  return next;
}
