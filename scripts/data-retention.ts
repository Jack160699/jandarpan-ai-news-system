#!/usr/bin/env npx tsx
/**
 * CLI for automated data retention (dry-run or execute).
 *
 *   npx tsx scripts/data-retention.ts --dry-run
 *   npx tsx scripts/data-retention.ts --execute
 *   npx tsx scripts/data-retention.ts --execute --skip-queue
 */

import { runDataRetention } from "../src/lib/ops/data-retention";

const args = new Set(process.argv.slice(2));
const dryRun = args.has("--dry-run") || !args.has("--execute");
const skipQueueCleanup = args.has("--skip-queue");

async function main() {
  const result = await runDataRetention({ dryRun, skipQueueCleanup });
  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
