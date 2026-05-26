/**
 * DAM async analyze queue — vision AI via worker jobs
 */

import { enqueueJob } from "@/lib/infrastructure/jobs/queue";
import { createAdminClient } from "@/lib/supabase";

export async function enqueueDamAnalyze(
  tenantId: string,
  assetId: string
): Promise<boolean> {
  const supabase = createAdminClient();

  await supabase.from("dam_analyze_queue").upsert(
    {
      tenant_id: tenantId,
      asset_id: assetId,
      status: "pending",
    },
    { onConflict: "asset_id" }
  );

  const jobId = await enqueueJob({
    jobType: "dam_analyze",
    dedupeKey: `dam:${assetId}`,
    tenantId,
    payload: { assetId },
    priority: 3,
  });

  return Boolean(jobId);
}
