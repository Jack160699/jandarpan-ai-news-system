/**
 * Tenant billing snapshot for the unified admin console.
 */

import { createAdminServerClient, isSupabaseConfigured } from "@/lib/supabase";
import type { DashboardBillingPlan } from "@/lib/dashboard/types";
import type { DashboardSession } from "@/lib/saas-auth/types";

export async function fetchTenantBilling(
  session: DashboardSession
): Promise<DashboardBillingPlan> {
  if (!isSupabaseConfigured()) return defaultBilling();

  const supabase = createAdminServerClient();
  const { data } = await supabase
    .from("tenant_billing")
    .select("*")
    .eq("tenant_id", session.membership.tenantId)
    .maybeSingle();

  return mapBilling(data);
}

function mapBilling(row: Record<string, unknown> | null): DashboardBillingPlan {
  if (!row) return defaultBilling();

  return {
    planId: String(row.plan_id ?? "starter"),
    planStatus: String(row.plan_status ?? "trialing"),
    articlesLimit: Number(row.articles_limit ?? 500),
    articlesUsed: Number(row.articles_used ?? 0),
    apiCallsLimit: Number(row.api_calls_limit ?? 10000),
    apiCallsUsed: Number(row.api_calls_used ?? 0),
    currentPeriodEnd: (row.current_period_end as string) ?? null,
    stripeCustomerId: (row.stripe_customer_id as string) ?? null,
  };
}

function defaultBilling(): DashboardBillingPlan {
  return {
    planId: "starter",
    planStatus: "trialing",
    articlesLimit: 500,
    articlesUsed: 0,
    apiCallsLimit: 10000,
    apiCallsUsed: 0,
    currentPeriodEnd: null,
    stripeCustomerId: null,
  };
}
