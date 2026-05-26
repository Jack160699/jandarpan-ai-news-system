import { roleHasPermission } from "@/lib/saas-auth/rbac";
import type { CanonicalRole } from "@/lib/saas-auth/roles";
import { CANONICAL_ROLES } from "@/lib/saas-auth/roles";
import type { DashboardPermission } from "@/lib/saas-auth/types";

const PERMISSION_LABELS: Record<DashboardPermission, string> = {
  "analytics:read": "Analytics",
  "content:read": "Read content",
  "content:write": "Edit content",
  "editorial:write": "Editorial desk",
  "publish:write": "Publish",
  "team:read": "View team",
  "team:write": "Manage team",
  "billing:read": "Billing",
  "billing:write": "Billing admin",
  "monitoring:read": "Monitoring",
  "providers:read": "Sources",
};

const ALL_PERMISSIONS = Object.keys(PERMISSION_LABELS) as DashboardPermission[];

export function permissionsForRole(role: CanonicalRole): DashboardPermission[] {
  return ALL_PERMISSIONS.filter((p) => roleHasPermission(role, p));
}

export function permissionLabelsForRole(role: CanonicalRole): string[] {
  return permissionsForRole(role).map((p) => PERMISSION_LABELS[p]);
}

export function rolePermissionsMatrix(): Record<CanonicalRole, string[]> {
  const matrix = {} as Record<CanonicalRole, string[]>;
  for (const role of CANONICAL_ROLES) {
    matrix[role] = permissionLabelsForRole(role);
  }
  return matrix;
}

export { PERMISSION_LABELS };
