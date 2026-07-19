/**
 * Safe repair for worker_jobs missing tenant_id (dry-run by default).
 *
 * Usage:
 *   npx tsx scripts/tenant-job-repair.ts
 *   npx tsx scripts/tenant-job-repair.ts --execute
 *
 * Only updates pending/claimed rows with null tenant_id → pipeline default tenant.
 * Does not rewrite completed/failed/dead history.
 */

import { createAdminClient } from "../src/lib/supabase";
import { getPipelineTenantId } from "../src/lib/tenant/pipeline";

async function main() {
  const execute = process.argv.includes("--execute");
  const tenantId = getPipelineTenantId();
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("worker_jobs")
    .select("id,job_type,status,dedupe_key,created_at")
    .is("tenant_id", null)
    .in("status", ["pending", "claimed"])
    .order("created_at", { ascending: true })
    .limit(500);

  if (error) {
    console.error(JSON.stringify({ ok: false, error: error.message }));
    process.exit(1);
  }

  const rows = data ?? [];
  console.log(
    JSON.stringify(
      {
        mode: execute ? "execute" : "dry-run",
        eligible: rows.length,
        targetTenantId: tenantId,
        sample: rows.slice(0, 10).map((r) => ({
          id: r.id,
          job_type: r.job_type,
          status: r.status,
        })),
      },
      null,
      2
    )
  );

  if (!execute || rows.length === 0) {
    console.log(
      JSON.stringify({
        ok: true,
        updated: 0,
        hint: execute
          ? "no_eligible_rows"
          : "re-run with --execute to apply repairs",
      })
    );
    return;
  }

  const ids = rows.map((r) => r.id);
  const { data: updated, error: updateError } = await supabase
    .from("worker_jobs")
    .update({
      tenant_id: tenantId,
      updated_at: new Date().toISOString(),
    })
    .in("id", ids)
    .is("tenant_id", null)
    .in("status", ["pending", "claimed"])
    .select("id");

  if (updateError) {
    console.error(JSON.stringify({ ok: false, error: updateError.message }));
    process.exit(1);
  }

  console.log(
    JSON.stringify({
      ok: true,
      updated: updated?.length ?? 0,
      targetTenantId: tenantId,
    })
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
