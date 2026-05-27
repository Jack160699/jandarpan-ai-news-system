import { createAdminServerClient, isSupabaseConfigured } from "@/lib/supabase";
import { asJsonObject, type JsonObject } from "@/types/json";
import type { DashboardSession } from "@/lib/saas-auth/types";

export async function logEditorialAudit(input: {
  session: DashboardSession;
  action: string;
  resourceType?: string;
  resourceId?: string | null;
  payload?: JsonObject;
}): Promise<void> {
  if (!isSupabaseConfigured() || input.session.isDevBypass) {
    console.log("[DASHBOARD_AUDIT]", {
      tenant: input.session.membership.tenantSlug,
      action: input.action,
      resourceId: input.resourceId,
      user: input.session.email,
    });
    return;
  }

  const supabase = createAdminServerClient();
  await supabase.from("editorial_audit_log").insert({
    tenant_id: input.session.membership.tenantId,
    user_id: input.session.userId,
    user_email: input.session.email,
    action: input.action,
    resource_type: input.resourceType ?? "article",
    resource_id: input.resourceId ?? null,
    payload: asJsonObject(input.payload ?? {}),
  });
}
