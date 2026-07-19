#!/usr/bin/env npx tsx
/**
 * Generation yield repair — dry-run by default.
 *
 *   npx tsx scripts/generation-yield-repair.ts audit
 *   npx tsx scripts/generation-yield-repair.ts quarantine-obsolete
 *   npx tsx scripts/generation-yield-repair.ts quarantine-obsolete --execute --batch-size=25
 *   npx tsx scripts/generation-yield-repair.ts verify
 */

import fs from "node:fs";
import path from "node:path";
import {
  runGenerationYieldRepair,
  type YieldRepairCommand,
} from "../src/lib/ops/generation-yield-repair";

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

function parseCommand(args: string[]): YieldRepairCommand {
  const cmd = args.find((a) => !a.startsWith("--"));
  const allowed: YieldRepairCommand[] = [
    "audit",
    "quarantine-obsolete",
    "verify",
  ];
  if (cmd && (allowed as string[]).includes(cmd)) return cmd as YieldRepairCommand;
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

  console.log("=== Generation Yield Repair ===");
  console.log(`Command: ${command}`);
  console.log(`Mode: ${dryRun ? "dry-run" : "EXECUTE"}`);
  console.log(`Time: ${new Date().toISOString()}`);
  console.log("Guards: no invented signals; no deletes; quarantine metadata only");

  const result = await runGenerationYieldRepair({
    dryRun,
    command,
    batchSize: argValue(args, "--batch-size")
      ? Number(argValue(args, "--batch-size"))
      : undefined,
    tenantId: argValue(args, "--tenant") ?? null,
    minAgeHours: argValue(args, "--min-age-hours")
      ? Number(argValue(args, "--min-age-hours"))
      : undefined,
    maxAgeHours: argValue(args, "--max-age-hours")
      ? Number(argValue(args, "--max-age-hours"))
      : undefined,
    stopOnErrorThreshold: argValue(args, "--stop-on-error")
      ? Number(argValue(args, "--stop-on-error"))
      : undefined,
  });

  const outDir = path.join(
    ROOT,
    "docs/audits/generation-yield-recovery/data"
  );
  fs.mkdirSync(outDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const jsonPath = path.join(outDir, `yield-repair-${command}-${stamp}.json`);
  fs.writeFileSync(
    jsonPath,
    JSON.stringify(
      {
        ...result,
        rows: result.rows.map((r) => ({
          eventId: r.eventId,
          createdAt: r.createdAt,
          urgencyScore: r.urgencyScore,
          listedSignalIds: r.listedSignalIds,
          foundSignalIds: r.foundSignalIds,
          classification: r.classification,
          reason: r.reason,
          retryable: r.retryable,
          alreadyGenerated: r.alreadyGenerated,
          action: r.action,
        })),
      },
      null,
      2
    )
  );

  console.log(result.summary);
  console.log(`Audit written: ${jsonPath}`);
  if (result.errors.length) {
    console.error("Errors:", result.errors.slice(0, 5));
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
