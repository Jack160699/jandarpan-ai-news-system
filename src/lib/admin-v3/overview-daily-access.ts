/**
 * Section-level permission model for GET /api/admin/overview/daily
 */

import { roleHasPermission } from "@/lib/saas-auth/rbac";
import type { DashboardPermission } from "@/lib/saas-auth/types";

export const DAILY_SECTIONS = [
  "editorial",
  "audience",
  "seo",
  "costs",
  "platform",
  "incidents",
] as const;

export type DailySection = (typeof DAILY_SECTIONS)[number];

/** Any of these grants access to the endpoint (partial payload). */
export const DAILY_ENDPOINT_PERMISSIONS: DashboardPermission[] = [
  "content:read",
  "editorial:write",
  "analytics:read",
  "monitoring:read",
  "billing:read",
];

const SECTION_PERMISSIONS: Record<DailySection, DashboardPermission[]> = {
  editorial: ["content:read", "editorial:write"],
  audience: ["analytics:read"],
  seo: ["analytics:read"],
  costs: ["billing:read"],
  platform: ["monitoring:read"],
  incidents: ["monitoring:read"],
};

export type DailySectionAccess = {
  granted: DailySection[];
  withheld: DailySection[];
  canAccessEndpoint: boolean;
  bySection: Record<DailySection, boolean>;
};

export function resolveDailySectionAccess(role: string): DailySectionAccess {
  const bySection = {} as Record<DailySection, boolean>;
  const granted: DailySection[] = [];
  const withheld: DailySection[] = [];

  for (const section of DAILY_SECTIONS) {
    const allowed = SECTION_PERMISSIONS[section].some((p) =>
      roleHasPermission(role, p)
    );
    bySection[section] = allowed;
    if (allowed) granted.push(section);
    else withheld.push(section);
  }

  const canAccessEndpoint = DAILY_ENDPOINT_PERMISSIONS.some((p) =>
    roleHasPermission(role, p)
  );

  return { granted, withheld, canAccessEndpoint, bySection };
}

export function sectionPermissionFor(section: DailySection): DashboardPermission[] {
  return SECTION_PERMISSIONS[section];
}
