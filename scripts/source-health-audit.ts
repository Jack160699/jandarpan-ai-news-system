/**
 * Read-only source health audit.
 *
 *   npx tsx scripts/source-health-audit.ts            print the audit
 *   npx tsx scripts/source-health-audit.ts --sql      also print the reversible retire SQL (still read-only: nothing is executed)
 *
 * Reads ingestion_source_state through the Supabase CLI direct-SQL path (works while REST is 402) and classifies every row with
 * the SAME deriveSourceHealth the admin dashboard uses, against the real RSS source registry. The stored health_state label is
 * only ever written "healthy" on success, so it cannot be trusted on its own (see source-health.ts).
 *
 * Retire candidates are rows that are enabled but ORPHANED (their rss: key is no longer in RSS_SOURCES, so nothing polls them)
 * -- they are dead rows that look healthy. Registry sources that are merely dormant/degraded are NOT retired here: they are
 * still polled and may recover; adaptive polling already backs them off (nextPollDelayMs).
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { RSS_SOURCES } from "../src/lib/news/providers/rss-sources";
import { deriveSourceHealth } from "../src/lib/news/ingestion/source-health";

const SQL = `select source_key, provider_family, enabled, health_state, last_attempted_at, last_successful_at, last_new_item_at,
  last_item_timestamp, consecutive_failures, consecutive_empty_runs, disabled_until, quota_exhausted_until, rate_limited_until,
  retirement_reason, metadata from ingestion_source_state order by source_key;`;

function readRows(): Array<Record<string, unknown>> {
  const file = path.join(os.tmpdir(), `source-health-audit-${process.pid}.sql`);
  fs.writeFileSync(file, SQL);
  try {
    const out = execFileSync("npx", ["--no-install", "supabase", "db", "query", "--linked", "-f", file, "-o", "json"], {
      encoding: "utf8",
      shell: process.platform === "win32",
      maxBuffer: 20 * 1024 * 1024,
    });
    // The CLI prints an object ({ rows: [...] }) after some banner lines; accept a bare array too.
    const brace = out.indexOf("{");
    const bracket = out.indexOf("[");
    const start = brace !== -1 && (bracket === -1 || brace < bracket) ? brace : bracket;
    const end = out.lastIndexOf(start === brace ? "}" : "]");
    const parsed = JSON.parse(out.slice(start, end + 1));
    return Array.isArray(parsed) ? parsed : ((parsed as { rows?: unknown[] }).rows as Array<Record<string, unknown>>) ?? [];
  } finally {
    fs.rmSync(file, { force: true });
  }
}

const known = new Set(RSS_SOURCES.map((s) => s.id));
const now = Date.now();
const rows = readRows();

const byStatus = new Map<string, string[]>();
const retire: Array<{ key: string; reason: string }> = [];
for (const r of rows) {
  const key = String(r.source_key);
  const family = String(r.provider_family);
  const id = key.replace(/^rss:/, "");
  const isKnown = family === "rss" ? known.has(id) : true;
  const d = deriveSourceHealth(r as never, { now, known: isKnown });
  const list = byStatus.get(d.status) ?? [];
  list.push(`${key}  [stored=${r.health_state}] ${d.reason}`);
  byStatus.set(d.status, list);
  if (d.status === "orphaned" && r.enabled === true) {
    retire.push({ key, reason: `orphaned: not in RSS_SOURCES registry (last success ${String(r.last_successful_at ?? "never")})` });
  }
}

console.log(`rows=${rows.length} registry_rss_sources=${known.size}`);
for (const [status, list] of [...byStatus.entries()].sort()) {
  console.log(`\n== ${status} (${list.length})`);
  for (const line of list) console.log(`  ${line}`);
}
const registryMissingState = [...known].filter((id) => !rows.some((r) => r.source_key === `rss:${id}`));
console.log(`\nregistry sources with NO state row yet (will be created on first poll): ${registryMissingState.length}`);
console.log(`retire candidates (enabled but orphaned): ${retire.length}`);

if (process.argv.includes("--sql")) {
  const keys = retire.map((r) => `'${r.key.replace(/'/g, "''")}'`).join(", ");
  console.log(`\n-- Reversible: previous values are kept in metadata.retired_by_audit. Undo by restoring enabled/health_state from it.
update ingestion_source_state
   set enabled = false,
       health_state = 'permanently_retired',
       retirement_reason = 'orphaned: source key no longer in the RSS registry (audit ${new Date().toISOString().slice(0, 10)})',
       metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object('retired_by_audit',
         jsonb_build_object('at', now(), 'prev_enabled', enabled, 'prev_health_state', health_state)),
       updated_at = now()
 where enabled = true and source_key in (${keys || "''"});`);
}
