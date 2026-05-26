/**
 * Ask PostgREST to reload its schema cache after migrations or DDL changes.
 * Requires service role (runs NOTIFY on the database).
 */

import { createAdminServerClient, isSupabaseConfigured } from "@/lib/supabase";

export async function reloadPostgrestSchema(): Promise<{
  ok: boolean;
  error?: string;
}> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "supabase_not_configured" };
  }

  const supabase = createAdminServerClient();

  const { error } = await supabase.rpc("reload_postgrest_schema" as never);

  if (!error) return { ok: true };

  const message = error.message ?? "reload_failed";

  if (
    message.includes("reload_postgrest_schema") ||
    message.includes("function") ||
    message.includes("does not exist")
  ) {
    return { ok: false, error: "reload_rpc_missing_run_migration_034" };
  }

  return { ok: false, error: message };
}
