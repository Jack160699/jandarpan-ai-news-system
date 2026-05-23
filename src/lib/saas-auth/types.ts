export type DashboardRole =
  | "owner"
  | "admin"
  | "editor"
  | "viewer"
  | "billing";

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
  role: DashboardRole;
  status: MembershipStatus;
};

export type DashboardSession = {
  userId: string;
  email: string;
  accessToken: string;
  membership: TenantMembership;
  isDevBypass: boolean;
};
