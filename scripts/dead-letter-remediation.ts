#!/usr/bin/env npx tsx
/**
 * Dead-letter remediation — classify, requeue safe jobs, purge the rest.
 *
 * Usage:
 *   npx tsx scripts/dead-letter-remediation.ts --dry-run
 *   npx tsx scripts/dead-letter-remediation.ts --execute
 */

import fs from "node:fs";
import path from "node:path";
import { runDeadLetterRemediation } from "../src/lib/ops/dead-letter-remediation";
import { countDeadLetters } from "../src/lib/infrastructure/jobs/queue";

const ROOT = path.resolve(import.meta.dirname, "..");

function loadEnvFile(file: string, override = false) {
  const full = path.join(ROOT, file);
  if (!fs.existsSync(full)) return;
  for (const line of fs.readFileSync(full, "utf8").split(/\r?\n/)) {
    if (!line || line.startsWith("#")) continue;
    const i = line.indexOf("=");
    if (i < 0) continue;
    const key = line.slice(0, i).trim();
    const val = line
      .slice(i + 1)
      .trim()
      .replace(/^['"]|['"]$/g, "");
    if (!val || val.length < 8) continue;
    if (override || !process.env[key]) process.env[key] = val;
  }
}

loadEnvFile(".env.local");
loadEnvFile(".env.production.local", true);
loadEnvFile(".env.vercel.production", true);

async function main() {
  const execute = process.argv.includes("--execute");
  const dryRun = !execute;

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  const before = await countDeadLetters();
  console.log(`Dead letters before: ${before}`);

  const result = await runDeadLetterRemediation({ dryRun, limit: 500 });
  console.log(JSON.stringify(result, null, 2));

  if (!dryRun) {
    const after = await countDeadLetters();
    console.log(`Dead letters after: ${after}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
