#!/usr/bin/env npx tsx
/**
 * Phase 3 — Safe editorial backlog recovery tooling.
 *
 * Dry-run by default. Never deletes queue or DLQ rows.
 *
 * Usage:
 *   npx tsx scripts/editorial-backlog-recovery.ts audit
 *   npx tsx scripts/editorial-backlog-recovery.ts retry
 *   npx tsx scripts/editorial-backlog-recovery.ts retry --execute --batch-size=3
 *   npx tsx scripts/editorial-backlog-recovery.ts release-stale-claims
 *   npx tsx scripts/editorial-backlog-recovery.ts quarantine --execute
 *   npx tsx scripts/editorial-backlog-recovery.ts list-obsolete
 *   npx tsx scripts/editorial-backlog-recovery.ts verify
 *   npx tsx scripts/editorial-backlog-recovery.ts classify-dlq
 *
 * Filters:
 *   --tenant=<uuid>
 *   --job-type=editorial_generate (repeatable)
 *   --batch-size=3
 *   --min-age-hours=1
 *   --max-age-hours=72
 *   --reason=timeout
 *   --class=eligible_immediate_retry (repeatable)
 *   --enqueue-wakeup
 *   --stop-on-error=2
 */

import fs from "node:fs";
import path from "node:path";
import {
  runEditorialBacklogRecovery,
  type RecoveryCommand,
} from "../src/lib/ops/editorial-backlog-recovery";
import type { BacklogClass } from "../src/lib/ops/editorial-backlog-types";

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

function argValue(args: string[], name: string): string | undefined {
  const prefix = `${name}=`;
  const hit = args.find((a) => a.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : undefined;
}

function argValues(args: string[], name: string): string[] {
  const prefix = `${name}=`;
  return args.filter((a) => a.startsWith(prefix)).map((a) => a.slice(prefix.length));
}

function parseCommand(args: string[]): RecoveryCommand {
  const cmd = args.find((a) => !a.startsWith("--"));
  const allowed: RecoveryCommand[] = [
    "audit",
    "retry",
    "release-stale-claims",
    "quarantine",
    "list-obsolete",
    "verify",
    "classify-dlq",
  ];
  if (cmd && (allowed as string[]).includes(cmd)) return cmd as RecoveryCommand;
  return "audit";
}

async function main() {
  const args = process.argv.slice(2);
  const execute = args.includes("--execute");
  const dryRun = args.includes("--dry-run") || !execute;
  const command = parseCommand(args);

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  const batchSizeRaw = argValue(args, "--batch-size");
  const minAge = argValue(args, "--min-age-hours");
  const maxAge = argValue(args, "--max-age-hours");
  const stopOnError = argValue(args, "--stop-on-error");

  console.log("=== Phase 3 Editorial Backlog Recovery ===");
  console.log(`Command: ${command}`);
  console.log(`Mode: ${dryRun ? "dry-run" : "EXECUTE"}`);
  console.log(`Time: ${new Date().toISOString()}`);
  console.log(
    "Guards: no destructive deletion; no blind requeue; stale stories → manual review"
  );

  const result = await runEditorialBacklogRecovery({
    dryRun,
    command,
    batchSize: batchSizeRaw ? Number(batchSizeRaw) : undefined,
    tenantId: argValue(args, "--tenant") ?? null,
    jobTypes: argValues(args, "--job-type"),
    minAgeHours: minAge ? Number(minAge) : undefined,
    maxAgeHours: maxAge ? Number(maxAge) : undefined,
    reasonContains: argValue(args, "--reason"),
    classes: argValues(args, "--class") as BacklogClass[],
    stopOnErrorThreshold: stopOnError ? Number(stopOnError) : undefined,
    enqueueWakeup: args.includes("--enqueue-wakeup"),
  });

  console.log("\n# Summary");
  console.log(result.summary);
  console.log(`Examined: ${result.examined}`);
  console.log(`By class: ${JSON.stringify(result.byClass, null, 2)}`);
  console.log(
    `Actions: attempted=${result.actionsAttempted} ok=${result.actionsSucceeded} fail=${result.actionsFailed} stopped=${result.stoppedOnError}`
  );

  if (result.selected.length) {
    console.log("\n# Selected");
    for (const c of result.selected) {
      console.log(
        `  ${c.jobId} ${c.jobType} ${c.class} → ${c.action} (${c.reasons.join(";")})`
      );
    }
  }

  if (result.dlq?.length) {
    console.log("\n# DLQ");
    for (const d of result.dlq.slice(0, 50)) {
      console.log(
        `  ${d.id} ${d.jobType} ${d.resolution} (${d.reasons.join(";")}) err=${d.lastError ?? ""}`
      );
    }
  }

  if (result.verification) {
    console.log("\n# Verification");
    console.log(JSON.stringify(result.verification, null, 2));
  }

  console.log("\n# Audit log (truncated)");
  console.log(JSON.stringify(result.audit.slice(0, 40), null, 2));

  const outDir = path.join(ROOT, "docs", "audits", "production-recovery", "logs");
  fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(
    outDir,
    `phase3-${command}-${dryRun ? "dryrun" : "execute"}-${Date.now()}.json`
  );
  fs.writeFileSync(outFile, JSON.stringify(result, null, 2), "utf8");
  console.log(`\nWrote audit artifact: ${outFile}`);

  if (!dryRun) {
    console.warn(
      "\nEXECUTE completed. Review verification before the next batch. Respect cooldown (60s)."
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
