import type { DashboardPermission, DashboardRole } from "@/lib/saas-auth/types";

const ROLE_PERMISSIONS: Record<DashboardRole, DashboardPermission[]> = {
  owner: [
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
  ],
  admin: [
    "analytics:read",
    "content:read",
    "content:write",
    "editorial:write",
    "publish:write",
    "team:read",
    "team:write",
    "monitoring:read",
    "providers:read",
  ],
  editor: [
    "analytics:read",
    "content:read",
    "content:write",
    "editorial:write",
    "publish:write",
    "providers:read",
  ],
  viewer: ["analytics:read", "content:read", "monitoring:read"],
  billing: ["analytics:read", "billing:read", "billing:write", "monitoring:read"],
};

export function roleHasPermission(
  role: DashboardRole,
  permission: DashboardPermission
): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function canAccessDashboardRoute(
  role: DashboardRole,
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
