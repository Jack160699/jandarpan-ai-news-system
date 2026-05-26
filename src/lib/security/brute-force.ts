/**
 * Brute-force protection & account lockout
 */

import { createAdminServerClient, isSupabaseConfigured } from "@/lib/supabase";
import {
  ACCOUNT_LOCKOUT_THRESHOLD,
  ACCOUNT_LOCKOUT_WINDOW_SEC,
  LOGIN_RATE_LIMIT,
} from "@/lib/security/constants";
import { logLoginEvent } from "@/lib/security/audit";
import { checkRateLimit } from "@/lib/security/rate-limit";

export async function checkLoginRateLimit(
  email: string,
  ip: string | null
): Promise<{ allowed: boolean; retryAfterSec?: number }> {
  const emailKey = `login:email:${email.toLowerCase()}`;
  const ipKey = ip ? `login:ip:${ip}` : null;

  const emailLimit = await checkRateLimit(
    emailKey,
    LOGIN_RATE_LIMIT.maxAttempts,
    LOGIN_RATE_LIMIT.windowSec
  );
  if (!emailLimit.allowed) {
    return { allowed: false, retryAfterSec: emailLimit.retryAfterSec };
  }

  if (ipKey) {
    const ipLimit = await checkRateLimit(
      ipKey,
      LOGIN_RATE_LIMIT.maxAttempts * 2,
      LOGIN_RATE_LIMIT.windowSec
    );
    if (!ipLimit.allowed) {
      return { allowed: false, retryAfterSec: ipLimit.retryAfterSec };
    }
  }

  return { allowed: true };
}

export async function recordLoginFailure(
  email: string,
  ip: string | null,
  userAgent: string | null,
  reason: string
): Promise<{ locked: boolean }> {
  await logLoginEvent({
    email,
    eventType: "login_failure",
    ipAddress: ip,
    userAgent,
    metadata: { reason },
  });

  const failKey = `login:fail:${email.toLowerCase()}`;
  const result = await checkRateLimit(
    failKey,
    ACCOUNT_LOCKOUT_THRESHOLD,
    ACCOUNT_LOCKOUT_WINDOW_SEC
  );

  if (!result.allowed) {
    await logLoginEvent({
      email,
      eventType: "account_locked",
      ipAddress: ip,
      userAgent,
      metadata: { threshold: ACCOUNT_LOCKOUT_THRESHOLD },
    });
    return { locked: true };
  }

  return { locked: false };
}

export async function isAccountLocked(email: string): Promise<boolean> {
  const failKey = `login:fail:${email.toLowerCase()}`;
  const result = await checkRateLimit(failKey, 1, ACCOUNT_LOCKOUT_WINDOW_SEC);
  // If we can't make even 1 attempt in window, account is locked
  if (!isSupabaseConfigured()) {
    return !result.allowed && result.retryAfterSec > ACCOUNT_LOCKOUT_WINDOW_SEC / 2;
  }

  const supabase = createAdminServerClient();
  const since = new Date(
    Date.now() - ACCOUNT_LOCKOUT_WINDOW_SEC * 1000
  ).toISOString();

  const { count } = await supabase
    .from("security_login_events")
    .select("id", { count: "exact", head: true })
    .eq("event_type", "login_failure")
    .ilike("email", email)
    .gte("created_at", since);

  return (count ?? 0) >= ACCOUNT_LOCKOUT_THRESHOLD;
}
