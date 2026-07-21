/**
 * Reader editable profile vs provider identity.
 * Provider fields are imported once; custom edits are never overwritten on login.
 */

export type ProviderIdentity = {
  displayName: string | null;
  avatarUrl: string | null;
  email: string | null;
};

export type ReaderEditableProfile = {
  /** Public display name (may be customized). */
  displayName: string;
  /** Public avatar URL (may be customized later). */
  avatarUrl: string | null;
  /** True once the reader saved a custom display name. */
  displayNameCustomized: boolean;
  /** True once the reader uploaded/replaced avatar. */
  avatarCustomized: boolean;
  homeDistrict: string | null;
  language: string | null;
  /** Explicit manual district choice stays authoritative for sync. */
  districtExplicit: boolean;
};

export type ReaderProfileRow = ReaderEditableProfile & {
  providerDisplayName: string | null;
  providerAvatarUrl: string | null;
  userId: string;
};

export const LOCAL_PROFILE_KEY = "cgb-reader-editable-profile";

export const DEFAULT_EDITABLE_PROFILE: ReaderEditableProfile = {
  displayName: "Reader",
  avatarUrl: null,
  displayNameCustomized: false,
  avatarCustomized: false,
  homeDistrict: null,
  language: null,
  districtExplicit: false,
};

/** Extract Google (or other OAuth) identity from Supabase user metadata. */
export function extractProviderIdentity(user: {
  email?: string | null;
  user_metadata?: Record<string, unknown> | null;
}): ProviderIdentity {
  const meta = user.user_metadata ?? {};
  const displayName =
    (typeof meta.full_name === "string" && meta.full_name.trim()) ||
    (typeof meta.name === "string" && meta.name.trim()) ||
    null;
  const avatarUrl =
    (typeof meta.avatar_url === "string" && meta.avatar_url.trim()) ||
    (typeof meta.picture === "string" && meta.picture.trim()) ||
    null;
  return {
    displayName,
    avatarUrl,
    email: user.email ?? null,
  };
}

/**
 * Merge provider identity into an existing editable profile.
 * Never overwrites customized display name or avatar.
 */
export function mergeProviderIntoProfile(
  existing: ReaderEditableProfile | null | undefined,
  provider: ProviderIdentity,
  fallbackGuestName = "Reader"
): ReaderEditableProfile {
  const base = existing ?? { ...DEFAULT_EDITABLE_PROFILE, displayName: fallbackGuestName };

  const displayName = base.displayNameCustomized
    ? base.displayName
    : provider.displayName?.trim() ||
      base.displayName ||
      provider.email?.split("@")[0] ||
      fallbackGuestName;

  const avatarUrl = base.avatarCustomized
    ? base.avatarUrl
    : provider.avatarUrl ?? base.avatarUrl;

  return {
    ...base,
    displayName,
    avatarUrl,
  };
}

/** Apply a user-edited display name (marks customized). */
export function applyCustomDisplayName(
  profile: ReaderEditableProfile,
  name: string
): ReaderEditableProfile {
  const trimmed = name.trim().slice(0, 80);
  if (!trimmed) return profile;
  return {
    ...profile,
    displayName: trimmed,
    displayNameCustomized: true,
  };
}

/** Apply a user-uploaded avatar URL (marks customized). */
export function applyCustomAvatarUrl(
  profile: ReaderEditableProfile,
  url: string
): ReaderEditableProfile {
  const trimmed = url.trim();
  if (!trimmed) return profile;
  return {
    ...profile,
    avatarUrl: trimmed,
    avatarCustomized: true,
  };
}

export function loadLocalEditableProfile(): ReaderEditableProfile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(LOCAL_PROFILE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ReaderEditableProfile>;
    return {
      ...DEFAULT_EDITABLE_PROFILE,
      ...parsed,
      displayNameCustomized: Boolean(parsed.displayNameCustomized),
      avatarCustomized: Boolean(parsed.avatarCustomized),
      districtExplicit: Boolean(parsed.districtExplicit),
    };
  } catch {
    return null;
  }
}

export function saveLocalEditableProfile(profile: ReaderEditableProfile): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LOCAL_PROFILE_KEY, JSON.stringify(profile));
  } catch {
    /* ignore quota */
  }
}

/** Avatar upload validation — used by controlled upload API. */
export const AVATAR_MAX_BYTES = 2 * 1024 * 1024; // 2 MiB
export const AVATAR_ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export function validateAvatarUpload(file: {
  type: string;
  size: number;
}): { ok: true } | { ok: false; error: string } {
  if (
    !AVATAR_ALLOWED_TYPES.includes(
      file.type as (typeof AVATAR_ALLOWED_TYPES)[number]
    )
  ) {
    return { ok: false, error: "invalid_type" };
  }
  if (file.size <= 0 || file.size > AVATAR_MAX_BYTES) {
    return { ok: false, error: "invalid_size" };
  }
  return { ok: true };
}
