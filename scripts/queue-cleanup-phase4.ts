#!/usr/bin/env npx tsx
/**
 * Phase 4 — Queue audit, stale classification, and production cleanup.
 *
 * Usage:
 *   npx tsx scripts/queue-cleanup-phase4.ts --audit
 *   npx tsx scripts/queue-cleanup-phase4.ts --dry-run
 *   npx tsx scripts/queue-cleanup-phase4.ts --execute
 *
 * Env: NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
 * Loads .env.production.local first, then .env.local
 */

import fs from "node:fs";
import path from "node:path";
import {
  auditAllQueues,
  runQueueCleanup,
  type QueueAuditReport,
  type StaleCounts,
} from "../src/lib/ops/queue-cleanup";

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

function printAudit(label: string, q: QueueAuditReport[keyof QueueAuditReport]) {
  if (typeof q !== "object" || !("pending" in q)) return;
  console.log(`\n## ${label}`);
  console.log(`  Pending:     ${q.pending}`);
  console.log(`  Processing:  ${q.processing}`);
  console.log(`  Retry:       ${q.retry}`);
  console.log(`  Completed:   ${q.completed}`);
  console.log(`  Dead:        ${q.dead}`);
  console.log(`  Avg age:     ${q.averageAgeHours ?? "n/a"}h`);
  console.log(`  Oldest job:  ${q.oldestJobAt ?? "n/a"}`);
}

function printStaleCounts(counts: StaleCounts) {
  for (const [queue, data] of Object.entries(counts)) {
    if (queue === "grandTotal") continue;
    const d = data as StaleCounts["ai"];
    console.log(`\n### ${queue} stale (${d.total} removable)`);
    for (const [reason, n] of Object.entries(d)) {
      if (reason === "total" || n === 0) continue;
      console.log(`  ${reason}: ${n}`);
    }
  }
  console.log(`\nGrand total stale: ${counts.grandTotal}`);
}

async function main() {
  const args = process.argv.slice(2);
  const execute = args.includes("--execute");
  const dryRun = args.includes("--dry-run") || !execute;
  const auditOnly = args.includes("--audit");

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  console.log("=== Phase 4 Queue Cleanup ===");
  console.log(`Mode: ${auditOnly ? "audit" : execute ? "EXECUTE" : "dry-run"}`);
  console.log(`Time: ${new Date().toISOString()}`);

  const audit = await auditAllQueues();
  console.log("\n# Task 1 — Queue Audit");
  printAudit("AI Queue", audit.ai);
  printAudit("Image Queue", audit.image);
  printAudit("Translation Queue", audit.translation);
  printAudit("Embedding Queue", audit.embedding);
  printAudit("Worker Jobs", audit.worker);

  if (auditOnly) {
    const result = await runQueueCleanup({ dryRun: true });
    console.log("\n# Task 2 — Stale Classification (dry-run counts)");
    printStaleCounts(result.staleCounts);
    return;
  }

  const result = await runQueueCleanup({ dryRun });
  console.log("\n# Task 2 — Stale Classification");
  printStaleCounts(result.staleCounts);

  if (!dryRun) {
    console.log("\n# Task 3 — Cleanup Executed");
    console.log(`  Removed:  ${result.removed.total}`);
    console.log(`  Archived: ${result.archived}`);
    console.log(`  AI: ${result.removed.ai}, Image: ${result.removed.image}`);
    console.log(`  Translation: ${result.removed.translation}, Embedding: ${result.removed.embedding}`);
    console.log(`  Worker: ${result.removed.worker}`);
  } else {
    console.log("\n# Task 3 — Cleanup (dry-run, no changes)");
    console.log(`  Would remove: ${result.removed.total}`);
  }

  console.log("\n# Task 4 — Post-Cleanup Health");
  console.log(`  AI pending:          ${result.health.aiPending}`);
  console.log(`  Images pending:      ${result.health.imagesPending}`);
  console.log(`  Translation pending: ${result.health.translationPending}`);
  console.log(`  Worker pending:      ${result.health.workerPending}`);
  console.log(`  AI drain/hr:         ${result.health.aiDrainPerHour}`);
  console.log(`  Editorial drain/hr:  ${result.health.editorialDrainPerHour}`);
  console.log(`  AI ETA:              ${result.health.aiEtaLabel}`);
  console.log(`  Editorial ETA:       ${result.health.editorialEtaLabel}`);
  console.log(`  Dashboard status:    ${result.health.expectedDashboardStatus}`);
  console.log(`  Backlog elevated:    ${result.health.backlogElevated}`);

  console.log("\n# Remaining Queues");
  printAudit("AI Queue", result.remaining.ai);
  printAudit("Image Queue", result.remaining.image);
  printAudit("Translation Queue", result.remaining.translation);
  printAudit("Worker Jobs", result.remaining.worker);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
