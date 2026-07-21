/**
 * District preference sync hooks for signed-in readers.
 *
 * Contract for Agent 3 (district ranking):
 * - Local explicit district choice is authoritative.
 * - Remote profile stores the selected district for cross-device sync.
 * - Ranking engines should read via `resolveAuthoritativeDistrict`, not invent logic here.
 */

import {
  loadLocalEditableProfile,
  saveLocalEditableProfile,
  type ReaderEditableProfile,
} from "@/lib/auth/reader-profile";
import { loadPreferences, savePreferences } from "@/lib/reader-preferences";
import { syncDistrictCookie } from "@/lib/personalization/cookies";

export type DistrictSyncSource = "local_explicit" | "remote" | "local_default";

export type DistrictSyncSnapshot = {
  districtSlug: string;
  source: DistrictSyncSource;
  explicit: boolean;
};

export type RemoteDistrictProfile = {
  homeDistrict: string | null;
};

/**
 * Resolve which district wins when local + remote disagree.
 * Explicit manual choice always wins.
 */
export function resolveAuthoritativeDistrict(input: {
  localDistrict: string | null | undefined;
  localExplicit: boolean;
  remoteDistrict: string | null | undefined;
  defaultDistrict?: string;
}): DistrictSyncSnapshot {
  const fallback = input.defaultDistrict ?? "raipur";
  const local = (input.localDistrict || "").trim() || fallback;

  if (input.localExplicit) {
    return { districtSlug: local, source: "local_explicit", explicit: true };
  }

  const remote = (input.remoteDistrict || "").trim();
  if (remote) {
    return { districtSlug: remote, source: "remote", explicit: false };
  }

  return { districtSlug: local, source: "local_default", explicit: false };
}

/** Persist an explicit district choice locally (authoritative). */
export function setExplicitLocalDistrict(slug: string): ReaderEditableProfile {
  const nextSlug = slug.trim() || "raipur";
  savePreferences({ homeDistrict: nextSlug });
  syncDistrictCookie(nextSlug);

  const existing = loadLocalEditableProfile() ?? {
    displayName: "Reader",
    avatarUrl: null,
    displayNameCustomized: false,
    avatarCustomized: false,
    homeDistrict: nextSlug,
    language: null,
    districtExplicit: true,
  };

  const next: ReaderEditableProfile = {
    ...existing,
    homeDistrict: nextSlug,
    districtExplicit: true,
  };
  saveLocalEditableProfile(next);
  return next;
}

/**
 * After login: optionally adopt remote district when local was never explicit.
 * Does not overwrite an explicit local choice.
 */
export function reconcileDistrictAfterLogin(
  remote: RemoteDistrictProfile | null
): DistrictSyncSnapshot {
  const prefs = loadPreferences();
  const localProfile = loadLocalEditableProfile();
  const resolved = resolveAuthoritativeDistrict({
    localDistrict: prefs.homeDistrict,
    localExplicit: Boolean(localProfile?.districtExplicit),
    remoteDistrict: remote?.homeDistrict,
  });

  if (resolved.source === "remote") {
    savePreferences({ homeDistrict: resolved.districtSlug });
    syncDistrictCookie(resolved.districtSlug);
    const base = localProfile ?? {
      displayName: "Reader",
      avatarUrl: null,
      displayNameCustomized: false,
      avatarCustomized: false,
      homeDistrict: resolved.districtSlug,
      language: null,
      districtExplicit: false,
    };
    saveLocalEditableProfile({
      ...base,
      homeDistrict: resolved.districtSlug,
      // Keep non-explicit so future remote updates can still apply until user picks.
      districtExplicit: false,
    });
  }

  return resolved;
}

/**
 * Payload Agent 3 / profile sync should push to `reader_profiles.home_district`.
 * Returns null when there is nothing new to push.
 */
export function districtPayloadForRemoteSync(): {
  homeDistrict: string;
  explicit: boolean;
} | null {
  if (typeof window === "undefined") return null;
  const prefs = loadPreferences();
  const local = loadLocalEditableProfile();
  const slug = (prefs.homeDistrict || local?.homeDistrict || "").trim();
  if (!slug) return null;
  return {
    homeDistrict: slug,
    explicit: Boolean(local?.districtExplicit),
  };
}
