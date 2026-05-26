/**
 * TOTP 2FA — enrollment, verification, backup codes
 */

import { createHash, randomBytes, createCipheriv, createDecipheriv } from "node:crypto";
import { authenticator } from "otplib";
import { createAdminServerClient, isSupabaseConfigured } from "@/lib/supabase";

const APP_NAME = "Jan Darpan OS";

function encryptionKey(): Buffer {
  const secret =
    process.env.SECURITY_2FA_ENCRYPTION_KEY ??
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    "dev-only-2fa-key-change-in-production";
  return createHash("sha256").update(secret).digest();
}

function encryptSecret(plain: string): string {
  const key = encryptionKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString("base64");
}

function decryptSecret(encoded: string): string {
  const buf = Buffer.from(encoded, "base64");
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const data = buf.subarray(28);
  const key = encryptionKey();
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}

export function generateTotpSecret(email: string): { secret: string; otpauthUrl: string } {
  const secret = authenticator.generateSecret();
  const otpauthUrl = authenticator.keyuri(email, APP_NAME, secret);
  return { secret, otpauthUrl };
}

export function verifyTotpToken(secret: string, token: string): boolean {
  try {
    return authenticator.verify({ token: token.replace(/\s/g, ""), secret });
  } catch {
    return false;
  }
}

export function generateBackupCodes(count = 8): string[] {
  return Array.from({ length: count }, () =>
    randomBytes(4).toString("hex").toUpperCase()
  );
}

function hashBackupCode(code: string): string {
  return createHash("sha256").update(code.toUpperCase()).digest("hex");
}

export async function get2faStatus(userId: string): Promise<{
  enabled: boolean;
  enabledAt: string | null;
}> {
  if (!isSupabaseConfigured()) return { enabled: false, enabledAt: null };

  const supabase = createAdminServerClient();
  const { data } = await supabase
    .from("user_two_factor")
    .select("enabled_at")
    .eq("user_id", userId)
    .maybeSingle();

  return {
    enabled: Boolean(data?.enabled_at),
    enabledAt: data?.enabled_at ?? null,
  };
}

export async function save2faEnrollment(
  userId: string,
  secret: string,
  backupCodes: string[]
): Promise<void> {
  const supabase = createAdminServerClient();
  await supabase.from("user_two_factor").upsert({
    user_id: userId,
    totp_secret_encrypted: encryptSecret(secret),
    enabled_at: null,
    backup_codes_hash: backupCodes.map(hashBackupCode),
    updated_at: new Date().toISOString(),
  });
}

export async function confirm2faEnrollment(userId: string): Promise<void> {
  const supabase = createAdminServerClient();
  await supabase
    .from("user_two_factor")
    .update({ enabled_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("user_id", userId);
}

export async function verify2faForUser(
  userId: string,
  token: string
): Promise<boolean> {
  if (!isSupabaseConfigured()) return true;

  const supabase = createAdminServerClient();
  const { data } = await supabase
    .from("user_two_factor")
    .select("totp_secret_encrypted, enabled_at, backup_codes_hash")
    .eq("user_id", userId)
    .maybeSingle();

  if (!data?.totp_secret_encrypted) return !data?.enabled_at;

  const secret = decryptSecret(data.totp_secret_encrypted);
  if (!data.enabled_at) {
    return verifyTotpToken(secret, token);
  }
  if (verifyTotpToken(secret, token)) return true;

  const hashes = (data.backup_codes_hash ?? []) as string[];
  const codeHash = hashBackupCode(token);
  if (hashes.includes(codeHash)) {
    await supabase
      .from("user_two_factor")
      .update({
        backup_codes_hash: hashes.filter((h) => h !== codeHash),
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId);
    return true;
  }

  return false;
}

export async function disable2fa(userId: string): Promise<void> {
  const supabase = createAdminServerClient();
  await supabase.from("user_two_factor").delete().eq("user_id", userId);
}

export async function is2faRequired(userId: string): Promise<boolean> {
  const status = await get2faStatus(userId);
  return status.enabled;
}

/** Enforce 2FA for super_admin in production when globally enabled */
export async function mustUse2fa(userId: string, role: string): Promise<boolean> {
  if (process.env.SECURITY_REQUIRE_2FA !== "1") {
    return await is2faRequired(userId);
  }
  if (role === "super_admin") return true;
  return await is2faRequired(userId);
}
