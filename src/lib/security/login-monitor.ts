/**
 * Suspicious login detection — new device / IP velocity
 */

import { createAdminServerClient, isSupabaseConfigured } from "@/lib/supabase";
import {
  SUSPICIOUS_IP_THRESHOLD,
  SUSPICIOUS_LOGIN_WINDOW_SEC,
} from "@/lib/security/constants";
import { logLoginEvent } from "@/lib/security/audit";

export async function detectSuspiciousLogin(input: {
  userId: string;
  email: string;
  ip: string | null;
  deviceFingerprint: string;
  tenantId?: string | null;
}): Promise<{ suspicious: boolean; reasons: string[] }> {
  const reasons: string[] = [];

  if (!isSupabaseConfigured()) {
    return { suspicious: false, reasons };
  }

  const supabase = createAdminServerClient();

  const { data: knownDevice } = await supabase
    .from("security_devices")
    .select("id, trusted")
    .eq("user_id", input.userId)
    .eq("device_fingerprint", input.deviceFingerprint)
    .maybeSingle();

  if (!knownDevice) {
    reasons.push("unknown_device");
  }

  if (input.ip) {
    const since = new Date(
      Date.now() - SUSPICIOUS_LOGIN_WINDOW_SEC * 1000
    ).toISOString();

    const { count } = await supabase
      .from("security_login_events")
      .select("id", { count: "exact", head: true })
      .eq("user_id", input.userId)
      .eq("event_type", "login_success")
      .neq("ip_address", input.ip)
      .gte("created_at", since);

    if ((count ?? 0) >= SUSPICIOUS_IP_THRESHOLD) {
      reasons.push("high_ip_velocity");
    }
  }

  const suspicious = reasons.length > 0;

  if (suspicious) {
    await logLoginEvent({
      userId: input.userId,
      email: input.email,
      tenantId: input.tenantId,
      eventType: "suspicious_login",
      ipAddress: input.ip,
      deviceFingerprint: input.deviceFingerprint,
      metadata: { reasons },
    });
  }

  return { suspicious, reasons };
}
