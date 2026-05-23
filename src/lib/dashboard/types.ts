import type { EditorialDashboardSnapshot } from "@/lib/editorial-dashboard/types";

export type DashboardBillingPlan = {
  planId: string;
  planStatus: string;
  articlesLimit: number;
  articlesUsed: number;
  apiCallsLimit: number;
  apiCallsUsed: number;
  currentPeriodEnd: string | null;
  stripeCustomerId: string | null;
};

export type DashboardTeamMember = {
  id: string;
  email: string;
  role: string;
  status: string;
  createdAt: string;
};

export type DashboardApiMetric = {
  route: string;
  method: string;
  count: number;
  avgLatencyMs: number;
  errorRate: number;
  lastStatus: number | null;
};

export type DashboardProviderMetric = {
  providerId: string;
  healthy: boolean;
  healthScore: number;
  failureCount: number;
  consecutiveFailures: number;
  avgLatencyMs: number;
  lastArticleCount: number;
  disabledUntil: string | null;
};

export type DashboardAuditEntry = {
  id: string;
  action: string;
  resourceType: string;
  resourceId: string | null;
  userEmail: string | null;
  createdAt: string;
  payload: Record<string, unknown>;
};

export type SaasDashboardSnapshot = EditorialDashboardSnapshot & {
  tenant: {
    id: string;
    slug: string;
    name: string;
  };
  billing: DashboardBillingPlan | null;
  team: DashboardTeamMember[];
  apiMetrics: DashboardApiMetric[];
  providerMetrics: DashboardProviderMetric[];
  recentAudit: DashboardAuditEntry[];
};
