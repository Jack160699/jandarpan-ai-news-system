#!/usr/bin/env npx tsx
/**
 * One-time production queue reset — archive ALL remaining pending AI jobs.
 *
 * Usage:
 *   npx tsx scripts/production-queue-reset.ts --audit
 *   npx tsx scripts/production-queue-reset.ts --dry-run
 *   npx tsx scripts/production-queue-reset.ts --execute
 */

import fs from "node:fs";
import path from "node:path";
import {
  auditAllQueues,
  auditRemainingAiJobs,
  runProductionQueueReset,
} from "../src/lib/ops/queue-cleanup";
import { checkQueues } from "../src/lib/observability/health/checks";

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
  const args = process.argv.slice(2);
  const execute = args.includes("--execute");
  const dryRun = args.includes("--dry-run") || !execute;
  const auditOnly = args.includes("--audit");

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  console.log("=== Production Queue Reset ===");
  console.log(`Mode: ${auditOnly ? "audit" : execute ? "EXECUTE" : "dry-run"}`);
  console.log(`Time: ${new Date().toISOString()}`);

  const aiAudit = await auditRemainingAiJobs();
  console.log("\n# Task 1 — Remaining AI Jobs Audit");
  console.log(`  Total pending:    ${aiAudit.total}`);
  console.log(`  Oldest:           ${aiAudit.oldest ?? "n/a"}`);
  console.log(`  Newest:           ${aiAudit.newest ?? "n/a"}`);
  console.log(`  Article exists:   ${aiAudit.articleExists}`);
  console.log(`  Article missing:  ${aiAudit.articleMissing}`);
  console.log(`  Already enriched: ${aiAudit.alreadyEnriched}`);
  console.log(`  Wire published:   ${aiAudit.wirePublished}`);
  console.log(`  With event:       ${aiAudit.withRelatedEvent}`);
  console.log(`  Still useful:     ${aiAudit.stillUseful}`);
  console.log(`  Not useful:       ${aiAudit.notUseful}`);

  if (aiAudit.samples.length) {
    console.log("\n  Sample jobs:");
    for (const s of aiAudit.samples) {
      console.log(
        `    ${s.queueId.slice(0, 8)}… article=${s.articleExists} enriched=${s.alreadyEnriched} event=${s.relatedEventId?.slice(0, 8) ?? "none"} useful=${s.stillUseful}`
      );
    }
  }

  if (auditOnly) {
    const queues = await auditAllQueues();
    console.log("\n# Current queue totals");
    console.log(`  AI pending: ${queues.ai.pending}`);
    console.log(`  Image pending: ${queues.image.pending}`);
    console.log(`  Worker pending: ${queues.worker.pending}`);
    return;
  }

  const result = await runProductionQueueReset({ dryRun });

  console.log(`\n# Task 2 — Archive ${dryRun ? "(dry-run)" : "EXECUTED"}`);
  console.log(`  AI jobs to cancel:  ${result.aiCancelled}`);
  console.log(`  AI jobs archived:   ${result.aiArchived}`);
  console.log(`  Worker archived:    ${result.workerArchived}`);
  console.log(`  Worker kept:        ${result.workerKept}`);

  console.log("\n# Task 3 — Queue Status");
  console.log(`  AI pending:          ${result.remaining.ai.pending}`);
  console.log(`  Images pending:      ${result.remaining.image.pending}`);
  console.log(`  Translation pending: ${result.remaining.translation.pending}`);
  console.log(`  Worker pending:      ${result.remaining.worker.pending}`);

  console.log("\n# Task 4 — Health");
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

  if (!dryRun) {
    const queueCheck = await checkQueues();
    console.log("\n# Processing queues check (health/checks.ts)");
    console.log(`  Status:  ${queueCheck.status}`);
    console.log(`  Message: ${queueCheck.message ?? "none"}`);
    console.log(`  Details: ${JSON.stringify(queueCheck.details)}`);
  }

  console.log("\n# Task 5 — Ingestion pipeline flags (unchanged)");
  const flags = {
    NEWSROOM_LEGACY_BRIDGE: process.env.NEWSROOM_LEGACY_BRIDGE ?? "(default true)",
    NEWSROOM_CLUSTER_EVENTS: process.env.NEWSROOM_CLUSTER_EVENTS ?? "(unset)",
    NEWSROOM_GENERATE_ARTICLES: process.env.NEWSROOM_GENERATE_ARTICLES ?? "(unset)",
    NEWSROOM_EDITORIAL_IMAGES: process.env.NEWSROOM_EDITORIAL_IMAGES ?? "(unset)",
    NEWSROOM_USE_EMBEDDINGS: process.env.NEWSROOM_USE_EMBEDDINGS ?? "(unset)",
  };
  console.log(JSON.stringify(flags, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
