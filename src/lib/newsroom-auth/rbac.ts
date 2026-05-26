import {
  canAccessDashboardRoute,
  roleHasPermission,
} from "@/lib/saas-auth/rbac";
import type { DashboardPermission, DashboardRole } from "@/lib/saas-auth/types";

const ADMIN_ROUTE_PERMISSIONS: Record<string, DashboardPermission> = {
  "/admin/intelligence": "analytics:read",
  "/admin/editorial": "content:read",
  "/admin/stories": "editorial:write",
  "/admin/articles": "content:read",
  "/admin/districts": "content:read",
  "/admin/topics": "content:read",
  "/admin/sources": "providers:read",
  "/admin/live-wire": "content:read",
  "/admin/images": "editorial:write",
  "/admin/analytics": "analytics:read",
  "/admin/ingestion": "monitoring:read",
};

export function canAccessAdminRoute(role: DashboardRole, pathname: string): boolean {
  const base = pathname.split("?")[0];
  if (base.startsWith("/admin/stories/")) {
    return roleHasPermission(role, "editorial:write");
  }

  const perm = ADMIN_ROUTE_PERMISSIONS[base];
  if (!perm) return roleHasPermission(role, "content:read");
  return roleHasPermission(role, perm);
}

export function isSuperAdmin(role: DashboardRole): boolean {
  return role === "owner" || role === "super_admin";
}

export function isPublisher(role: DashboardRole): boolean {
  return role === "publisher" || isSuperAdmin(role) || role === "admin";
}

export function isEditor(role: DashboardRole): boolean {
  return (
    role === "editor" ||
    isPublisher(role) ||
    role === "viewer"
  );
}

export { canAccessDashboardRoute, roleHasPermission };
