import "server-only";

import { verifiedRatesDb } from "@/lib/verified-rates/db";

export async function isProviderKilled(sourceId: string): Promise<boolean> {
  try {
    const { data } = await verifiedRatesDb()
      .from("verified_rate_provider_health")
      .select("kill_switch, circuit_open")
      .eq("source_id", sourceId)
      .maybeSingle();
    return Boolean(data?.kill_switch || data?.circuit_open);
  } catch {
    return false;
  }
}

export async function recordProviderAttempt(opts: {
  sourceId: string;
  ok: boolean;
  errorCode?: string;
}): Promise<void> {
  try {
    const db = verifiedRatesDb();
    const { data: prev } = await db
      .from("verified_rate_provider_health")
      .select("consecutive_failures, last_success_at, kill_switch")
      .eq("source_id", opts.sourceId)
      .maybeSingle();
    const failures = opts.ok ? 0 : Number(prev?.consecutive_failures ?? 0) + 1;
    await db.from("verified_rate_provider_health").upsert({
      source_id: opts.sourceId,
      last_attempt_at: new Date().toISOString(),
      last_success_at: opts.ok ? new Date().toISOString() : prev?.last_success_at ?? null,
      last_error_code: opts.ok ? null : opts.errorCode ?? "error",
      consecutive_failures: failures,
      circuit_open: failures >= 5,
      kill_switch: Boolean(prev?.kill_switch),
      updated_at: new Date().toISOString(),
    });
  } catch {
    /* non-fatal */
  }
}
