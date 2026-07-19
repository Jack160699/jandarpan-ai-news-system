/**
 * Enterprise security audit logging (service role)
 */

import { createAdminServerClient, isSupabaseConfigured } from "@/lib/supabase";
import { asJsonObject, type JsonObject } from "@/types/json";

export type SecurityAuditAction =
  | "auth.login"
  | "auth.logout"
  | "auth.login_failed"
  | "auth.session_revoked"
  | "auth.2fa_enabled"
  | "auth.2fa_disabled"
  | "auth.account_locked"
  | "auth.suspicious_login"
  | "rbac.permission_changed"
  | "rbac.role_changed"
  | "admin.super_action"
  | "admin.access_denied"
  | "admin.session_invalid"
  | "admin.session_mismatch"
  | "api.forbidden"
  | "api.rate_limited";

export type LoginEventType =
  | "login_success"
  | "login_failure"
  | "logout"
  | "session_revoked"
  | "password_reset"
  | "2fa_enabled"
  | "2fa_disabled"
  | "2fa_challenge_success"
  | "2fa_challenge_failure"
  | "suspicious_login"
  | "account_locked";

type AuditInput = {
  tenantId?: string | null;
  actorUserId?: string | null;
  actorEmail?: string | null;
  action: SecurityAuditAction;
  resourceType?: string;
  resourceId?: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: JsonObject;
};

type LoginEventInput = {
  userId?: string | null;
  email?: string | null;
  tenantId?: string | null;
  eventType: LoginEventType;
  ipAddress?: string | null;
  userAgent?: string | null;
  deviceFingerprint?: string | null;
  metadata?: JsonObject;
};

export async function logSecurityAudit(input: AuditInput): Promise<void> {
  if (!isSupabaseConfigured()) {
    if (process.env.NODE_ENV === "development") {
      console.info("[security-audit]", input.action, input);
    }
    return;
  }

  const supabase = createAdminServerClient();
  await supabase.from("security_audit_events").insert({
    tenant_id: input.tenantId ?? null,
    actor_user_id: input.actorUserId ?? null,
    actor_email: input.actorEmail ?? null,
    action: input.action,
    resource_type: input.resourceType ?? null,
    resource_id: input.resourceId ?? null,
    ip_address: input.ipAddress ?? null,
    user_agent: input.userAgent ?? null,
    metadata: asJsonObject(input.metadata ?? {}),
  });
}

export async function logLoginEvent(input: LoginEventInput): Promise<void> {
  if (!isSupabaseConfigured()) {
    if (process.env.NODE_ENV === "development") {
      console.info("[security-login]", input.eventType, input.email);
    }
    return;
  }

  const supabase = createAdminServerClient();
  await supabase.from("security_login_events").insert({
    user_id: input.userId ?? null,
    email: input.email ?? null,
    tenant_id: input.tenantId ?? null,
    event_type: input.eventType,
    ip_address: input.ipAddress ?? null,
    user_agent: input.userAgent ?? null,
    device_fingerprint: input.deviceFingerprint ?? null,
    metadata: asJsonObject(input.metadata ?? {}),
  });
}

export async function logPermissionChange(input: {
  tenantId: string;
  targetUserId?: string | null;
  targetEmail?: string | null;
  changedByUserId?: string | null;
  changedByEmail?: string | null;
  previousRole?: string | null;
  newRole?: string | null;
  previousStatus?: string | null;
  newStatus?: string | null;
  ipAddress?: string | null;
}): Promise<void> {
  if (!isSupabaseConfigured()) return;

  const supabase = createAdminServerClient();
  await supabase.from("security_permission_changes").insert({
    tenant_id: input.tenantId,
    target_user_id: input.targetUserId ?? null,
    target_email: input.targetEmail ?? null,
    changed_by_user_id: input.changedByUserId ?? null,
    changed_by_email: input.changedByEmail ?? null,
    previous_role: input.previousRole ?? null,
    new_role: input.newRole ?? null,
    previous_status: input.previousStatus ?? null,
    new_status: input.newStatus ?? null,
    ip_address: input.ipAddress ?? null,
  });

  await logSecurityAudit({
    tenantId: input.tenantId,
    actorUserId: input.changedByUserId,
    actorEmail: input.changedByEmail,
    action: "rbac.permission_changed",
    resourceType: "tenant_membership",
    resourceId: input.targetUserId ?? input.targetEmail ?? undefined,
    ipAddress: input.ipAddress,
    metadata: asJsonObject({
      ...(input.previousRole != null ? { previousRole: input.previousRole } : {}),
      ...(input.newRole != null ? { newRole: input.newRole } : {}),
      ...(input.previousStatus != null ? { previousStatus: input.previousStatus } : {}),
      ...(input.newStatus != null ? { newStatus: input.newStatus } : {}),
    } as Record<string, unknown>),
  });
}
