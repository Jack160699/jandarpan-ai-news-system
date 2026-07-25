#!/usr/bin/env npx tsx
/**
 * Dry-run audit: published generated_articles that are too short / summary-like.
 *
 * Default: dry-run only (read + report). Never writes to Production.
 *
 * Usage:
 *   npx tsx scripts/audit-editorial-depth.ts
 *   npx tsx scripts/audit-editorial-depth.ts --limit 300
 *   npx tsx scripts/audit-editorial-depth.ts --out reports/editorial-depth-audit.json
 */

import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import {
  auditEditorialDepthRow,
  summarizeEditorialDepthAudit,
  type EditorialDepthAuditRow,
} from "../src/lib/news/ai/editorial-depth-audit";

const ROOT = path.resolve(import.meta.dirname, "..");

function loadEnvFile(file: string, override = false) {
  const full = path.join(ROOT, file);
  if (!fs.existsSync(full)) return;
  for (const line of fs.readFileSync(full, "utf8").split(/\r?\n/)) {
    if (!line || line.startsWith("#")) continue;
    const i = line.indexOf("=");
    if (i < 0) continue;
    const key = line.slice(0, i).trim();
    const val = line.slice(i + 1).trim().replace(/^['"]|['"]$/g, "");
    if (!val || val.length < 8) continue;
    if (override || !process.env[key]) process.env[key] = val;
  }
}

loadEnvFile(".env.local");
loadEnvFile(".env.production.local", true);

function parseArgs(argv: string[]) {
  const limitIdx = argv.indexOf("--limit");
  const outIdx = argv.indexOf("--out");
  return {
    limit: limitIdx >= 0 ? Number(argv[limitIdx + 1]) || 500 : 500,
    out:
      outIdx >= 0
        ? argv[outIdx + 1]
        : path.join(ROOT, "reports", `editorial-depth-audit-${Date.now()}.json`),
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  const supabase = createClient(url, key);
  const { data, error } = await supabase
    .from("generated_articles")
    .select(
      "id, headline, summary, article_body, language, editorial_metadata, published_at, event_id"
    )
    .not("published_at", "is", null)
    .order("published_at", { ascending: false })
    .limit(args.limit);

  if (error) {
    console.error(error.message);
    process.exit(1);
  }

  const rows = (data ?? []).map((row) => {
    const meta =
      row.editorial_metadata && typeof row.editorial_metadata === "object"
        ? (row.editorial_metadata as Record<string, unknown>)
        : {};
    return {
      id: row.id,
      headline: row.headline,
      summary: row.summary,
      article_body: row.article_body,
      language: row.language,
      editorial_metadata: meta,
      published_at: row.published_at,
      category: typeof meta.category === "string" ? meta.category : null,
      region: typeof meta.region === "string" ? meta.region : null,
      source_count:
        typeof meta.source_count === "number" ? meta.source_count : null,
      urgency_score: null,
    } satisfies EditorialDepthAuditRow;
  });
  const findings = rows
    .map((row) => auditEditorialDepthRow(row))
    .filter((f): f is NonNullable<typeof f> => Boolean(f));

  const summary = summarizeEditorialDepthAudit(findings);
  const report = {
    dryRun: true,
    scanned: rows.length,
    ...summary,
    findings: findings.slice(0, 200),
    generatedAt: new Date().toISOString(),
  };

  fs.mkdirSync(path.dirname(args.out), { recursive: true });
  fs.writeFileSync(args.out, JSON.stringify(report, null, 2), "utf8");

  console.log(
    JSON.stringify(
      {
        dryRun: true,
        scanned: rows.length,
        affectedCount: summary.affectedCount,
        byCode: summary.byCode,
        byType: summary.byType,
        estimatedTotalRegenCostUsd: summary.estimatedTotalRegenCostUsd,
        out: args.out,
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
