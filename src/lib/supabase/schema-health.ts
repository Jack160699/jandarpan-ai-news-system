/**
 * Schema health checks — runtime verification against production expectations.
 */

import { createAdminServerClient, isSupabaseConfigured } from "@/lib/supabase";

export type SchemaHealthCheck = {
  id: string;
  ok: boolean;
};

export type SchemaHealthReport = {
  ok: boolean;
  checkedAt: string;
  migrationLatest: string;
  schemaChecksum: string | null;
  expectedChecksum: string | null;
  checksumMatch: boolean;
  checks: SchemaHealthCheck[];
  postgrestReload?: { ok: boolean; error?: string };
};

const CRITICAL_TABLES = [
  "tenant_memberships",
  "newsroom_tenants",
  "generated_articles",
  "editorial_workflow_events",
  "intelligence_embeddings",
  "dam_assets",
  "newsroom_editor_locks",
  "reader_analytics_events",
  "ingestion_logs",
  "ingestion_failures",
  "rss_source_health",
] as const;

const CRITICAL_COLUMNS: Array<{ table: string; column: string; id: string }> = [
  { table: "tenant_memberships", column: "display_name", id: "col_display_name" },
  { table: "tenant_memberships", column: "permissions", id: "col_permissions" },
  { table: "intelligence_embeddings", column: "embedding_json", id: "col_embedding_json" },
  { table: "intelligence_embeddings", column: "updated_at", id: "col_embedding_updated_at" },
  { table: "generated_articles", column: "workflow_status", id: "col_workflow_status" },
];

/** Probe tables via PostgREST (detects stale schema cache). */
async function probeTable(
  table: string
): Promise<{ ok: boolean; schemaCacheError: boolean }> {
  const supabase = createAdminServerClient();
  const { error } = await supabase.from(table as never).select("id", { head: true, count: "exact" });

  if (!error) return { ok: true, schemaCacheError: false };

  const msg = (error.message ?? "").toLowerCase();
  const schemaCacheError =
    msg.includes("schema cache") ||
    msg.includes("could not find") ||
    msg.includes("relation") ||
    msg.includes("column");

  return { ok: false, schemaCacheError };
}

/** Full health report via DB RPC (preferred when migration 033 applied). */
export async function fetchSchemaHealthFromDb(): Promise<SchemaHealthReport | null> {
  if (!isSupabaseConfigured()) return null;

  const supabase = createAdminServerClient();
  const { data, error } = await supabase.rpc("get_schema_health" as never);

  if (error || !data) return null;

  const raw = data as {
    ok: boolean;
    checked_at: string;
    migration_latest: string;
    schema_checksum: string | null;
    expected_checksum: string | null;
    checks: Array<{ id: string; ok: boolean }>;
  };

  return {
    ok: raw.ok,
    checkedAt: raw.checked_at,
    migrationLatest: raw.migration_latest,
    schemaChecksum: raw.schema_checksum ?? null,
    expectedChecksum: raw.expected_checksum ?? null,
    checksumMatch:
      Boolean(raw.schema_checksum) &&
      Boolean(raw.expected_checksum) &&
      raw.schema_checksum === raw.expected_checksum,
    checks: (raw.checks ?? []).map((c) => ({ id: c.id, ok: c.ok })),
  };
}

/** Client-side probes when RPC unavailable (pre-033 or cache issues). */
export async function runSchemaHealthChecks(): Promise<SchemaHealthReport> {
  if (!isSupabaseConfigured()) {
    return {
      ok: false,
      checkedAt: new Date().toISOString(),
      migrationLatest: "unknown",
      schemaChecksum: null,
      expectedChecksum: null,
      checksumMatch: false,
      checks: [{ id: "supabase_configured", ok: false }],
    };
  }

  const fromDb = await fetchSchemaHealthFromDb();
  if (fromDb) {
    const { reloadPostgrestSchema } = await import("@/lib/supabase/reload-schema");
    const reload = await reloadPostgrestSchema();
    return { ...fromDb, postgrestReload: reload };
  }

  const checks: SchemaHealthCheck[] = [];
  let schemaCacheStale = false;

  for (const table of CRITICAL_TABLES) {
    const probe = await probeTable(table);
    checks.push({ id: `table_${table}`, ok: probe.ok });
    if (probe.schemaCacheError) schemaCacheStale = true;
  }

  for (const col of CRITICAL_COLUMNS) {
    const supabase = createAdminServerClient();
    const { error } = await supabase
      .from(col.table as never)
      .select(col.column, { head: true });

    const msg = (error?.message ?? "").toLowerCase();
    const ok = !error;
    if (!ok && (msg.includes("schema cache") || msg.includes("could not find"))) {
      schemaCacheStale = true;
    }
    checks.push({ id: col.id, ok });
  }

  const { reloadPostgrestSchema } = await import("@/lib/supabase/reload-schema");
  const postgrestReload = await reloadPostgrestSchema();

  if (schemaCacheStale && postgrestReload.ok) {
    for (const table of CRITICAL_TABLES) {
      const probe = await probeTable(table);
      const idx = checks.findIndex((c) => c.id === `table_${table}`);
      if (idx >= 0) checks[idx] = { id: checks[idx].id, ok: probe.ok };
    }
  }

  return {
    ok: checks.every((c) => c.ok),
    checkedAt: new Date().toISOString(),
    migrationLatest: "unknown",
    schemaChecksum: null,
    expectedChecksum: null,
    checksumMatch: false,
    checks,
    postgrestReload,
  };
}

let startupCheckDone = false;

/** Non-blocking startup probe — logs warnings only. */
export async function runStartupSchemaHealthCheck(): Promise<void> {
  if (startupCheckDone || process.env.SCHEMA_HEALTH_STARTUP === "0") return;
  startupCheckDone = true;

  try {
    const report = await runSchemaHealthChecks();
    if (!report.ok) {
      console.warn(
        "[schema-health] Startup check failed:",
        report.checks.filter((c) => !c.ok).map((c) => c.id).join(", ")
      );
    }
  } catch (e) {
    console.warn("[schema-health] Startup check error:", e);
  }
}
