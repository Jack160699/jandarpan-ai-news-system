/**
 * Session tracking, revocation, device registry
 */

import { createAdminServerClient, isSupabaseConfigured } from "@/lib/supabase";
import { SESSION_MAX_AGE_SEC } from "@/lib/security/constants";
import { hashSessionToken } from "@/lib/security/request-context";
import { withTimeoutFallback } from "@/lib/utils/withTimeout";

const SESSION_DB_TIMEOUT_MS = 3_000;

export async function registerSecuritySession(input: {
  userId: string;
  tenantId?: string | null;
  accessToken: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  deviceFingerprint?: string | null;
}): Promise<string | null> {
  if (!isSupabaseConfigured()) return null;

  const supabase = createAdminServerClient();
  const tokenHash = hashSessionToken(input.accessToken);
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_SEC * 1000).toISOString();

  const { data, error } = await supabase
    .from("security_sessions")
    .insert({
      user_id: input.userId,
      tenant_id: input.tenantId ?? null,
      session_token_hash: tokenHash,
      device_fingerprint: input.deviceFingerprint ?? null,
      user_agent: input.userAgent ?? null,
      ip_address: input.ipAddress ?? null,
      expires_at: expiresAt,
    })
    .select("id")
    .single();

  if (error) return null;
  return data?.id ?? null;
}

export async function touchSecuritySession(accessToken: string): Promise<void> {
  if (!isSupabaseConfigured()) return;

  const supabase = createAdminServerClient();
  const tokenHash = hashSessionToken(accessToken);

  await withTimeoutFallback(
    supabase
      .from("security_sessions")
      .update({ last_seen_at: new Date().toISOString() })
      .eq("session_token_hash", tokenHash)
      .is("revoked_at", null)
      .then(() => undefined),
    undefined,
    { label: "touch_security_session", timeoutMs: SESSION_DB_TIMEOUT_MS }
  );
}

export async function isSessionRevoked(accessToken: string): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;

  const supabase = createAdminServerClient();
  const tokenHash = hashSessionToken(accessToken);

  const row = await withTimeoutFallback(
    supabase
      .from("security_sessions")
      .select("id, revoked_at, expires_at")
      .eq("session_token_hash", tokenHash)
      .maybeSingle()
      .then((r) => r.data),
    null,
    { label: "session_revoked_check", timeoutMs: SESSION_DB_TIMEOUT_MS }
  );

  if (!row) return false;
  if (row.revoked_at) return true;
  if (row.expires_at && new Date(row.expires_at) < new Date()) return true;
  return false;
}

export async function revokeSession(
  accessToken: string,
  reason = "logout"
): Promise<void> {
  if (!isSupabaseConfigured()) return;

  const supabase = createAdminServerClient();
  const tokenHash = hashSessionToken(accessToken);

  await supabase
    .from("security_sessions")
    .update({
      revoked_at: new Date().toISOString(),
      revoke_reason: reason,
    })
    .eq("session_token_hash", tokenHash)
    .is("revoked_at", null);
}

export async function revokeAllUserSessions(
  userId: string,
  exceptTokenHash?: string,
  reason = "security_revoke_all"
): Promise<void> {
  if (!isSupabaseConfigured()) return;

  const supabase = createAdminServerClient();
  let query = supabase
    .from("security_sessions")
    .update({
      revoked_at: new Date().toISOString(),
      revoke_reason: reason,
    })
    .eq("user_id", userId)
    .is("revoked_at", null);

  if (exceptTokenHash) {
    query = query.neq("session_token_hash", exceptTokenHash);
  }

  await query;
}

export async function registerDevice(input: {
  userId: string;
  deviceFingerprint: string;
  userAgent?: string | null;
  label?: string;
}): Promise<void> {
  if (!isSupabaseConfigured()) return;

  const supabase = createAdminServerClient();
  const now = new Date().toISOString();

  await supabase.from("security_devices").upsert(
    {
      user_id: input.userId,
      device_fingerprint: input.deviceFingerprint,
      user_agent: input.userAgent ?? null,
      label: input.label ?? null,
      last_seen_at: now,
    },
    { onConflict: "user_id,device_fingerprint" }
  );
}

export async function listUserSessions(userId: string) {
  if (!isSupabaseConfigured()) return [];

  const supabase = createAdminServerClient();
  const { data } = await supabase
    .from("security_sessions")
    .select(
      "id, device_fingerprint, user_agent, ip_address, last_seen_at, created_at, revoked_at, expires_at"
    )
    .eq("user_id", userId)
    .is("revoked_at", null)
    .order("last_seen_at", { ascending: false })
    .limit(20);

  return data ?? [];
}
