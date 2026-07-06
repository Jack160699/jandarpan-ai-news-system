#!/usr/bin/env npx tsx
/**
 * Phase 5D — Re-enqueue published articles awaiting AI hero images.
 *
 * Idempotent: upserts editorial_image_queue on generated_article_id.
 *
 * Usage:
 *   npx tsx scripts/requeue-editorial-images.ts --audit
 *   npx tsx scripts/requeue-editorial-images.ts --dry-run
 *   npx tsx scripts/requeue-editorial-images.ts --execute
 *   npx tsx scripts/requeue-editorial-images.ts --execute --limit 50
 */

import fs from "node:fs";
import path from "node:path";
import {
  getEditorialImageMeta,
  hasAiEditorialHero,
} from "../src/lib/news/ai/editorial-image-terminal";
import { enqueueEditorialImage } from "../src/lib/news/ai/editorial-image-queue";

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
loadEnvFile(".env.vercel.production", true);

type ArticleRow = {
  id: string;
  headline: string | null;
  hero_image_url: string | null;
  editorial_metadata: unknown;
  published_at: string | null;
};

async function findCandidates(limit?: number): Promise<ArticleRow[]> {
  const { createAdminServerClient } = await import("../src/lib/supabase");
  const supabase = createAdminServerClient();
  const pageSize = 500;
  const candidates: ArticleRow[] = [];
  let offset = 0;

  while (true) {
    const { data, error } = await supabase
      .from("generated_articles")
      .select("id, headline, hero_image_url, editorial_metadata, published_at")
      .not("published_at", "is", null)
      .order("published_at", { ascending: false })
      .range(offset, offset + pageSize - 1);

    if (error) throw new Error(error.message);
    if (!data?.length) break;

    for (const row of data) {
      const meta = getEditorialImageMeta(row.editorial_metadata);
      if (meta.status !== "queued") continue;
      if (hasAiEditorialHero(row)) continue;
      candidates.push(row);
      if (limit && candidates.length >= limit) return candidates;
    }

    if (data.length < pageSize) break;
    offset += pageSize;
  }

  return candidates;
}

async function countQueueState() {
  const { createAdminServerClient } = await import("../src/lib/supabase");
  const supabase = createAdminServerClient();
  const [pending, processing, completed, failed] = await Promise.all(
    (["pending", "processing", "completed", "failed"] as const).map(async (status) => {
      const { count } = await supabase
        .from("editorial_image_queue")
        .select("id", { count: "exact", head: true })
        .eq("status", status);
      return count ?? 0;
    })
  );
  return { pending, processing, completed, failed, total: pending + processing + completed + failed };
}

async function measureAiCoverage() {
  const { createAdminServerClient } = await import("../src/lib/supabase");
  const supabase = createAdminServerClient();
  const { data } = await supabase
    .from("generated_articles")
    .select("id, hero_image_url, editorial_metadata")
    .not("published_at", "is", null);

  let ai = 0;
  const n = data?.length ?? 0;
  for (const row of data ?? []) {
    if (hasAiEditorialHero(row)) ai++;
  }
  return { total: n, ai, pct: n ? Math.round((ai / n) * 1000) / 10 : 0 };
}

async function main() {
  const args = process.argv.slice(2);
  const auditOnly = args.includes("--audit");
  const execute = args.includes("--execute");
  const dryRun = !execute;
  const limitArg = args.find((a) => a.startsWith("--limit="));
  const limit = limitArg ? Number(limitArg.split("=")[1]) : undefined;

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  const coverageBefore = await measureAiCoverage();
  const queueBefore = await countQueueState();
  const candidates = await findCandidates(limit);

  console.log("=== Phase 5D Editorial Image Requeue ===");
  console.log(`Mode: ${auditOnly ? "audit" : execute ? "EXECUTE" : "dry-run"}`);
  console.log(`Time: ${new Date().toISOString()}`);
  console.log("\n# Coverage before");
  console.log(`  Published: ${coverageBefore.total}`);
  console.log(`  AI heroes: ${coverageBefore.ai} (${coverageBefore.pct}%)`);
  console.log("\n# Queue before");
  console.log(JSON.stringify(queueBefore, null, 2));
  console.log(`\n# Candidates (status=queued, no AI hero): ${candidates.length}`);

  if (candidates.length) {
    console.log("\n  Sample:");
    for (const row of candidates.slice(0, 5)) {
      const meta = getEditorialImageMeta(row.editorial_metadata);
      console.log(
        `    ${row.id.slice(0, 8)}… ${meta.source ?? "none"} | ${row.headline?.slice(0, 50) ?? ""}`
      );
    }
  }

  if (auditOnly) return;

  let enqueued = 0;
  let failed = 0;

  if (!dryRun) {
    for (const row of candidates) {
      const ok = await enqueueEditorialImage(row.id);
      if (ok) enqueued++;
      else failed++;
    }
  }

  const queueAfter = dryRun ? queueBefore : await countQueueState();
  const coverageAfter = dryRun ? coverageBefore : await measureAiCoverage();

  console.log(`\n# Requeue ${dryRun ? "(dry-run)" : "EXECUTED"}`);
  console.log(`  Would enqueue / enqueued: ${dryRun ? candidates.length : enqueued}`);
  if (!dryRun) console.log(`  Failed: ${failed}`);

  console.log("\n# Queue after");
  console.log(JSON.stringify(queueAfter, null, 2));

  if (!dryRun) {
    console.log("\n# Coverage after (requeue only — run worker to process)");
    console.log(`  AI heroes: ${coverageAfter.ai} (${coverageAfter.pct}%)`);
  }

  console.log(
    JSON.stringify(
      {
        dryRun,
        candidates: candidates.length,
        enqueued: dryRun ? 0 : enqueued,
        failed: dryRun ? 0 : failed,
        coverageBefore,
        coverageAfter: dryRun ? coverageBefore : coverageAfter,
        queueBefore,
        queueAfter,
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
