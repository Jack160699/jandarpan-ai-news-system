#!/usr/bin/env node
/**
 * Schema verification — runs against linked Supabase via CLI.
 * Usage: node scripts/verify-schema.mjs
 *        npm run schema:verify
 */

import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const sqlFile = join(root, "supabase", ".temp", "verify_schema_query.sql");

function run() {
  let raw;
  try {
    raw = execSync(`npx supabase db query --linked -f "${sqlFile}" -o json`, {
      cwd: root,
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
    });
  } catch (e) {
    console.error("Failed to query linked database. Is Supabase CLI linked?");
    console.error(e.stderr?.toString() ?? e.message);
    process.exit(1);
  }

  const parsed = JSON.parse(raw);
  const row = parsed.rows?.[0]?.report;
  if (!row) {
    console.error("Unexpected CLI output:", raw.slice(0, 500));
    process.exit(1);
  }

  const health = row.health;
  const failed = (health.checks ?? []).filter((c) => !c.ok);

  console.log("Schema health:", health.ok ? "PASS" : "FAIL");
  console.log("Migration latest:", health.migration_latest);
  console.log("Checksum:", health.schema_checksum);
  console.log("Expected:", health.expected_checksum);
  console.log("Checksum match:", health.schema_checksum === health.expected_checksum);

  if (failed.length) {
    console.log("\nFailed checks:");
    for (const c of failed) {
      console.log(`  - ${c.id}`);
    }
    process.exit(1);
  }

  console.log("\nAll checks passed.");
  process.exit(0);
}

run();
