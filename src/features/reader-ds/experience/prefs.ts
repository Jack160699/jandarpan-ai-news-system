/**
 * Phase 4 reader experience prefs — local device storage only.
 * Extends existing reader/profile keys without inventing server-side state.
 */

import {
  loadPreferences,
  savePreferences,
  type FontScale,
  type ReaderTheme,
} from "@/lib/reader-preferences";
import {
  loadProfileV3Prefs,
  saveProfileV3Prefs,
} from "@/features/profile-v3/lib/profile-prefs";

const EXP_KEY = "jd-ds-experience-prefs";

export type PlaybackSpeed = 0.75 | 1 | 1.25 | 1.5 | 1.75 | 2;

export type ExperiencePrefs = {
  dataSaving: boolean;
  wifiOnlyDownload: boolean;
  highContrast: boolean;
  screenReaderOptimized: boolean;
  themeMode: "system" | ReaderTheme;
  fontScale: FontScale;
  playbackSpeed: PlaybackSpeed;
  autoplayNext: boolean;
  quietHours: boolean;
  notifyBreaking: boolean;
  notifyDistrict: boolean;
  notifyFollowed: boolean;
  notifyBriefing: boolean;
  notifyOffers: boolean;
  downloadsBytes: number;
  downloadBudgetBytes: number;
  downloadedIds: string[];
};

export const DEFAULT_EXPERIENCE_PREFS: ExperiencePrefs = {
  dataSaving: false,
  wifiOnlyDownload: true,
  highContrast: false,
  screenReaderOptimized: true,
  themeMode: "system",
  fontScale: "base",
  playbackSpeed: 1,
  autoplayNext: true,
  quietHours: true,
  notifyBreaking: true,
  notifyDistrict: true,
  notifyFollowed: true,
  notifyBriefing: false,
  notifyOffers: false,
  downloadsBytes: 0,
  downloadBudgetBytes: 200 * 1024 * 1024,
  downloadedIds: [],
};

export function loadExperiencePrefs(): ExperiencePrefs {
  if (typeof window === "undefined") return DEFAULT_EXPERIENCE_PREFS;
  try {
    const raw = localStorage.getItem(EXP_KEY);
    const base = raw
      ? { ...DEFAULT_EXPERIENCE_PREFS, ...(JSON.parse(raw) as ExperiencePrefs) }
      : { ...DEFAULT_EXPERIENCE_PREFS };
    const reader = loadPreferences();
    const profile = loadProfileV3Prefs();
    return {
      ...base,
      fontScale: reader.fontScale ?? base.fontScale,
      themeMode:
        base.themeMode === "system"
          ? "system"
          : reader.theme === "dark"
            ? "dark"
            : "light",
      notifyBreaking: profile.breakingAlerts,
      notifyBriefing: profile.morningBriefAlerts,
    };
  } catch {
    return DEFAULT_EXPERIENCE_PREFS;
  }
}

export function saveExperiencePrefs(partial: Partial<ExperiencePrefs>): ExperiencePrefs {
  if (typeof window === "undefined") return DEFAULT_EXPERIENCE_PREFS;
  const next = { ...loadExperiencePrefs(), ...partial };
  localStorage.setItem(EXP_KEY, JSON.stringify(next));

  if (partial.fontScale) savePreferences({ fontScale: partial.fontScale });
  if (partial.themeMode === "light" || partial.themeMode === "dark") {
    savePreferences({ theme: partial.themeMode });
  }
  if (
    partial.notifyBreaking != null ||
    partial.notifyBriefing != null
  ) {
    saveProfileV3Prefs({
      breakingAlerts: next.notifyBreaking,
      morningBriefAlerts: next.notifyBriefing,
    });
  }

  applyExperienceToDocument(next);
  return next;
}

export function applyExperienceToDocument(prefs: ExperiencePrefs) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.setAttribute("data-data-saving", prefs.dataSaving ? "1" : "0");
  root.setAttribute("data-high-contrast", prefs.highContrast ? "1" : "0");
  root.setAttribute("data-font-scale", prefs.fontScale);
  if (prefs.themeMode === "system") {
    root.removeAttribute("data-theme-forced");
  } else {
    root.setAttribute("data-theme", prefs.themeMode);
    root.setAttribute("data-theme-forced", "1");
  }
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(0)} MB`;
}

export function estimateTrackBytes(durationSec: number): number {
  // Rough AAC estimate (~16 KB/s) for storage UI — not a live meter.
  return Math.max(400_000, Math.round(durationSec * 16_000));
}
