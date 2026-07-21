/**
 * Supabase reader_profiles row helpers (client-side, RLS-scoped).
 * Table may be absent until Agent 7 applies the migration — callers must tolerate failure.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import type {
  ProviderIdentity,
  ReaderEditableProfile,
} from "@/lib/auth/reader-profile";
import { mergeProviderIntoProfile } from "@/lib/auth/reader-profile";

export type ReaderProfileRow = {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  provider_display_name: string | null;
  provider_avatar_url: string | null;
  display_name_customized: boolean;
  avatar_customized: boolean;
  home_district: string | null;
  language: string | null;
  district_explicit: boolean;
  updated_at?: string;
};

type Client = SupabaseClient<Database>;

function profiles(client: Client) {
  return client.from("reader_profiles");
}

export function rowToEditable(row: ReaderProfileRow): ReaderEditableProfile {
  return {
    displayName: row.display_name?.trim() || "Reader",
    avatarUrl: row.avatar_url,
    displayNameCustomized: Boolean(row.display_name_customized),
    avatarCustomized: Boolean(row.avatar_customized),
    homeDistrict: row.home_district,
    language: row.language,
    districtExplicit: Boolean(row.district_explicit),
  };
}

/**
 * Fetch own profile under RLS. Returns null when missing or table unavailable.
 */
export async function fetchOwnReaderProfile(
  client: Client,
  userId: string
): Promise<ReaderProfileRow | null> {
  const { data, error } = await profiles(client)
    .select(
      "user_id, display_name, avatar_url, provider_display_name, provider_avatar_url, display_name_customized, avatar_customized, home_district, language, district_explicit, updated_at"
    )
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) return null;
  return data as ReaderProfileRow;
}

/**
 * Upsert provider identity + merge into editable fields without clobbering customs.
 * Also pushes district when provided.
 */
export async function upsertReaderProfileOnLogin(
  client: Client,
  userId: string,
  provider: ProviderIdentity,
  local: ReaderEditableProfile | null,
  district?: { homeDistrict: string; explicit: boolean } | null
): Promise<ReaderEditableProfile> {
  const existingRow = await fetchOwnReaderProfile(client, userId);
  const existingEditable = existingRow
    ? rowToEditable(existingRow)
    : local;

  const merged = mergeProviderIntoProfile(existingEditable, provider);

  const payload = {
    user_id: userId,
    display_name: merged.displayName,
    avatar_url: merged.avatarUrl,
    provider_display_name: provider.displayName,
    provider_avatar_url: provider.avatarUrl,
    display_name_customized: merged.displayNameCustomized,
    avatar_customized: merged.avatarCustomized,
    home_district:
      district?.homeDistrict ??
      merged.homeDistrict ??
      existingRow?.home_district ??
      null,
    language: merged.language,
    district_explicit:
      district?.explicit ??
      merged.districtExplicit ??
      Boolean(existingRow?.district_explicit),
    updated_at: new Date().toISOString(),
  };

  const { error } = await profiles(client).upsert(payload, {
    onConflict: "user_id",
  });

  if (error) {
    // Table may not exist yet — keep local merge.
    return {
      ...merged,
      homeDistrict: payload.home_district,
      districtExplicit: payload.district_explicit,
    };
  }

  return {
    ...merged,
    homeDistrict: payload.home_district,
    districtExplicit: payload.district_explicit,
  };
}

/** Authorized update of editable fields only (caller must be authenticated as userId). */
export async function updateOwnReaderProfile(
  client: Client,
  userId: string,
  patch: Partial<ReaderEditableProfile>
): Promise<{ ok: true; profile: ReaderEditableProfile } | { ok: false; error: string }> {
  const existing = await fetchOwnReaderProfile(client, userId);
  const base = existing ? rowToEditable(existing) : {
    displayName: "Reader",
    avatarUrl: null,
    displayNameCustomized: false,
    avatarCustomized: false,
    homeDistrict: null,
    language: null,
    districtExplicit: false,
  };

  const next: ReaderEditableProfile = {
    ...base,
    ...patch,
    displayName: (patch.displayName ?? base.displayName).trim().slice(0, 80) || base.displayName,
  };

  const { error } = await profiles(client).upsert(
    {
      user_id: userId,
      display_name: next.displayName,
      avatar_url: next.avatarUrl,
      display_name_customized: next.displayNameCustomized,
      avatar_customized: next.avatarCustomized,
      home_district: next.homeDistrict,
      language: next.language,
      district_explicit: next.districtExplicit,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );

  if (error) return { ok: false, error: error.message };
  return { ok: true, profile: next };
}
