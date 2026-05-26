import type { DashboardPermission, TenantMembership } from "@/lib/saas-auth/types";

/** Canonical admin session API response shape */
export type AdminSessionResponse = {
  ok: boolean;
  user?: {
    id: string;
    email: string;
    isDevBypass?: boolean;
  };
  membership?: TenantMembership;
  permissions?: DashboardPermission[];
  error?: string;
  message?: string;
};

export type AdminSessionStatus =
  | "loading"
  | "ready"
  | "guest"
  | "degraded"
  | "error";
