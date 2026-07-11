#!/usr/bin/env npx tsx
/**
 * Revive dead translate_article jobs in worker_jobs (+ worker_dead_letters).
 *
 * Usage:
 *   npx tsx scripts/revive-dead-translations.ts --dry-run
 *   npx tsx scripts/revive-dead-translations.ts --execute
 */

import fs from "node:fs";
import path from "node:path";
import {
  reviveDeadWorkerJobs,
  runDeadLetterRemediation,
  purgeSupersededDeadJobs,
} from "../src/lib/ops/dead-letter-remediation";

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
loadEnvFile(".env.local.bak-phase5a", true);

async function main() {
  const execute = process.argv.includes("--execute");
  const dryRun = !execute;

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  const jobTypes = ["translate_article", "translation_batch"];

  const queue = await reviveDeadWorkerJobs({ dryRun, limit: 100, jobTypes });
  console.log("worker_jobs revival:", JSON.stringify(queue, null, 2));

  const dlq = await runDeadLetterRemediation({ dryRun, limit: 100, jobTypes });
  console.log("worker_dead_letters:", JSON.stringify(dlq, null, 2));

  const purged = await purgeSupersededDeadJobs({ dryRun, jobTypes });
  console.log("superseded dead purge:", JSON.stringify(purged, null, 2));

  console.log(
    JSON.stringify(
      {
        dryRun,
        revived: queue.revived + dlq.requeued,
        purged: purged.purged,
        discarded: queue.discarded + dlq.discarded,
      },
      null,
      2
    )
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
