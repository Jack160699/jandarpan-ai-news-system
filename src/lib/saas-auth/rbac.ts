import type { CanonicalRole } from "@/lib/saas-auth/roles";
import { normalizeDashboardRole } from "@/lib/saas-auth/roles";
import type { DashboardPermission, DashboardRole } from "@/lib/saas-auth/types";

const SUPER_ADMIN_PERMISSIONS: DashboardPermission[] = [
  "analytics:read",
  "content:read",
  "content:write",
  "editorial:write",
  "publish:write",
  "team:read",
  "team:write",
  "billing:read",
  "billing:write",
  "monitoring:read",
  "providers:read",
];

const ROLE_PERMISSIONS: Record<CanonicalRole, DashboardPermission[]> = {
  super_admin: SUPER_ADMIN_PERMISSIONS,
  moderator: [
    "analytics:read",
    "content:read",
    "content:write",
    "editorial:write",
    "publish:write",
    "monitoring:read",
    "providers:read",
  ],
  editor: [
    "analytics:read",
    "content:read",
    "content:write",
    "editorial:write",
    "providers:read",
  ],
  journalist: [
    "analytics:read",
    "content:read",
    "content:write",
    "editorial:write",
    "monitoring:read",
  ],
};

export function roleHasPermission(
  role: DashboardRole | string,
  permission: DashboardPermission
): boolean {
  const canonical = normalizeDashboardRole(String(role));
  return ROLE_PERMISSIONS[canonical]?.includes(permission) ?? false;
}

export function canAccessDashboardRoute(
  role: DashboardRole | string,
  route: string
): boolean {
  const map: Record<string, DashboardPermission> = {
    "/dashboard": "analytics:read",
    "/dashboard/content": "content:read",
    "/dashboard/publish": "publish:write",
    "/dashboard/editorial": "editorial:write",
    "/dashboard/team": "team:read",
    "/dashboard/billing": "billing:read",
    "/dashboard/analytics": "analytics:read",
    "/dashboard/monitoring": "monitoring:read",
    "/dashboard/providers": "providers:read",
  };

  const perm = map[route];
  if (!perm) return true;
  return roleHasPermission(role, perm);
}

export { normalizeDashboardRole };
