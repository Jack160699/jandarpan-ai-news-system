/**
 * Tenant isolation guards for service-role queries
 */

import { createAdminServerClient, isSupabaseConfigured } from "@/lib/supabase";

export type TenantAccessResult =
  | { ok: true }
  | { ok: false; error: "not_found" | "no_database" };

export async function assertGeneratedArticleTenantAccess(
  articleId: string,
  tenantId: string
): Promise<TenantAccessResult> {
  if (!isSupabaseConfigured()) return { ok: false, error: "no_database" };

  const supabase = createAdminServerClient();
  const { data } = await supabase
    .from("generated_articles")
    .select("id")
    .eq("id", articleId)
    .eq("tenant_id", tenantId)
    .maybeSingle();

  if (!data) return { ok: false, error: "not_found" };
  return { ok: true };
}
