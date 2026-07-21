import {
  canAccessDashboardRoute,
  roleHasPermission,
} from "@/lib/saas-auth/rbac";
import { normalizeDashboardRole } from "@/lib/saas-auth/roles";
import type { DashboardPermission, DashboardRole } from "@/lib/saas-auth/types";

const ADMIN_ROUTE_PERMISSIONS: Record<string, DashboardPermission> = {
  "/admin/overview": "analytics:read",
  "/admin/business": "analytics:read",
  "/admin/technical": "monitoring:read",
  "/admin/intelligence": "analytics:read",
  "/admin/intelligence/digest": "analytics:read",
  "/admin/ai-copilot": "analytics:read",
  "/admin/seo/competitors": "analytics:read",
  "/admin/seo/intelligence": "analytics:read",
  "/admin/seo/rankings": "analytics:read",
  "/admin/seo/search-console": "analytics:read",
  "/admin/seo/execution": "analytics:read",
  "/admin/seo/autonomous": "analytics:read",
  "/admin/editorial": "content:read",
  "/admin/stories": "editorial:write",
  "/admin/editor": "editorial:write",
  "/admin/workflow": "editorial:write",
  "/admin/collaboration": "editorial:write",
  "/admin/articles": "content:read",
  "/admin/districts": "content:read",
  "/admin/topics": "content:read",
  "/admin/sources": "providers:read",
  "/admin/live-wire": "content:read",
  "/admin/images": "editorial:write",
  "/admin/media": "editorial:write",
  "/admin/analytics": "analytics:read",
  "/admin/settings": "editorial:write",
  "/admin/settings/organization": "editorial:write",
  "/admin/ingestion": "monitoring:read",
  "/admin/health": "monitoring:read",
  "/admin/verified-rates": "monitoring:read",
  "/admin/system": "monitoring:read",
  "/admin/executive": "billing:read",
  "/admin/billing": "billing:read",
  "/admin/team": "team:read",
};

export function canAccessAdminRoute(role: DashboardRole | string, pathname: string): boolean {
  const base = pathname.split("?")[0];

  if (base === "/admin/team" || base === "/admin/schema") {
    return isSuperAdmin(role);
  }

  if (base.startsWith("/admin/stories/") || base.startsWith("/admin/editor/")) {
    return roleHasPermission(role, "editorial:write");
  }

  const perm = ADMIN_ROUTE_PERMISSIONS[base];
  if (!perm) return roleHasPermission(role, "content:read");
  return roleHasPermission(role, perm);
}

export function isSuperAdmin(role: DashboardRole | string): boolean {
  return normalizeDashboardRole(String(role)) === "super_admin";
}

export function isModerator(role: DashboardRole | string): boolean {
  const r = normalizeDashboardRole(String(role));
  return r === "moderator" || r === "super_admin";
}

export function isEditor(role: DashboardRole | string): boolean {
  const r = normalizeDashboardRole(String(role));
  return r === "editor" || r === "moderator" || r === "super_admin";
}

export { canAccessDashboardRoute, roleHasPermission };
