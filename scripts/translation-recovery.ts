#!/usr/bin/env npx tsx
/**
 * Phase 4 — Safe translation backlog recovery.
 *
 * Dry-run by default. Does not delete jobs.
 *
 * Usage:
 *   npx tsx scripts/translation-recovery.ts
 *   npx tsx scripts/translation-recovery.ts --execute --batch-size=10
 *   npx tsx scripts/translation-recovery.ts --pair=hi:en --pair=en:hi
 *   npx tsx scripts/translation-recovery.ts --tenant=<uuid>
 *   npx tsx scripts/translation-recovery.ts --reason=urgencyScore
 *   npx tsx scripts/translation-recovery.ts --coverage-only
 */

import fs from "node:fs";
import path from "node:path";
import {
  parseLanguagePairArg,
  reportTranslationCoverageMetrics,
  runTranslationRecovery,
} from "../src/lib/ops/translation-recovery";

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

async function main() {
  const args = process.argv.slice(2);
  const execute = args.includes("--execute");
  const dryRun = args.includes("--dry-run") || !execute;
  const coverageOnly = args.includes("--coverage-only");

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  console.log("=== Phase 4 Translation Recovery ===");
  console.log(`Mode: ${coverageOnly ? "coverage-only" : dryRun ? "dry-run" : "EXECUTE"}`);
  console.log(`Time: ${new Date().toISOString()}`);
  console.log(`CG translation: ${process.env.NEWSROOM_CG_TRANSLATION === "true" ? "ENABLED" : "disabled (default)"}`);

  if (coverageOnly) {
    const coverage = await reportTranslationCoverageMetrics({
      tenantId: argValue(args, "--tenant") ?? null,
    });
    console.log(JSON.stringify(coverage, null, 2));
    return;
  }

  const pairs = argValues(args, "--pair")
    .map(parseLanguagePairArg)
    .filter((p): p is NonNullable<typeof p> => Boolean(p));

  const batchRaw = argValue(args, "--batch-size");
  const result = await runTranslationRecovery({
    dryRun,
    batchSize: batchRaw ? Number(batchRaw) : 10,
    tenantId: argValue(args, "--tenant") ?? null,
    languagePairs: pairs.length ? pairs : undefined,
    retryableErrorFilter: argValue(args, "--reason"),
    includeDead: args.includes("--include-dead"),
  });

  console.log("\n# Summary");
  console.log(result.summary);
  console.log(`By class: ${JSON.stringify(result.byClass, null, 2)}`);
  console.log("\n# Coverage (active hi/en; CG only if enabled)");
  console.log(JSON.stringify(result.coverage, null, 2));
  console.log("\n# Audit (truncated)");
  console.log(JSON.stringify(result.audit.slice(0, 40), null, 2));

  const outDir = path.join(ROOT, "docs", "audits", "production-recovery", "logs");
  fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(
    outDir,
    `phase4-translation-${dryRun ? "dryrun" : "execute"}-${Date.now()}.json`
  );
  fs.writeFileSync(outFile, JSON.stringify(result, null, 2), "utf8");
  console.log(`\nWrote audit artifact: ${outFile}`);

  if (!dryRun) {
    console.warn("\nEXECUTE completed. Do not flood OpenAI — wait before next batch.");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
