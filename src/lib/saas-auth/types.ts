import type { CanonicalRole } from "@/lib/saas-auth/roles";

/** Canonical + legacy aliases accepted at runtime (normalized in session) */
export type DashboardRole = CanonicalRole | "owner" | "admin" | "publisher" | "viewer" | "billing";

export type MembershipStatus = "active" | "invited" | "suspended";

export type DashboardPermission =
  | "analytics:read"
  | "content:read"
  | "content:write"
  | "editorial:write"
  | "publish:write"
  | "team:read"
  | "team:write"
  | "billing:read"
  | "billing:write"
  | "monitoring:read"
  | "providers:read";

export type TenantMembership = {
  id: string;
  tenantId: string;
  tenantSlug: string;
  tenantName: string;
  userId: string;
  email: string;
  role: CanonicalRole;
  status: MembershipStatus;
};

export type DashboardSession = {
  userId: string;
  email: string;
  accessToken: string;
  membership: TenantMembership;
  isDevBypass: boolean;
};
