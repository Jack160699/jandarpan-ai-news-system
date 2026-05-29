/**
 * Typed admin permission helpers — single source for UI + client guards.
 * Server APIs must still call requireDashboardSession / requireSuperAdminSession.
 */

import { isSuperAdmin as rbacIsSuperAdmin } from "@/lib/newsroom-auth/rbac";
import { roleHasPermission } from "@/lib/saas-auth/rbac";
import { normalizeDashboardRole } from "@/lib/saas-auth/roles";
import type { CanonicalRole } from "@/lib/saas-auth/roles";
import type { DashboardPermission } from "@/lib/saas-auth/types";

export type AdminPermissionContext = {
  role: string | null | undefined;
  authReady: boolean;
  permissions?: DashboardPermission[];
};

export function hasResolvedRole(
  ctx: Pick<AdminPermissionContext, "role" | "authReady">
): boolean {
  return ctx.authReady && Boolean(ctx.role?.trim());
}

export function resolveCanonicalRole(role: string | null | undefined): CanonicalRole | null {
  if (!role?.trim()) return null;
  return normalizeDashboardRole(role);
}

export function isSuperAdmin(role: string | null | undefined): boolean {
  if (!role?.trim()) return false;
  return rbacIsSuperAdmin(role);
}

export function hasPermission(
  ctx: AdminPermissionContext,
  permission: DashboardPermission
): boolean {
  if (!hasResolvedRole(ctx)) return false;
  if (ctx.permissions?.includes(permission)) return true;
  return roleHasPermission(ctx.role!, permission);
}

/** Team management is super-admin only in this product. */
export function canManageTeam(ctx: AdminPermissionContext): boolean {
  return hasResolvedRole(ctx) && isSuperAdmin(ctx.role);
}

export function canAccessBilling(ctx: AdminPermissionContext): boolean {
  return hasPermission(ctx, "billing:read");
}
