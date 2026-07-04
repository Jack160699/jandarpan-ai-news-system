#!/usr/bin/env node
/**
 * Audit translation coverage for published generated_articles.
 *
 * Usage:
 *   node scripts/audit-translation-coverage.mjs
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in .env.local
 */

import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const ROOT = path.resolve(import.meta.dirname, "..");

function loadEnv() {
  const file = path.join(ROOT, ".env.local");
  if (!fs.existsSync(file)) {
    console.error("Missing .env.local");
    process.exit(1);
  }
  const env = {};
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    if (!line || line.startsWith("#")) continue;
    const i = line.indexOf("=");
    if (i < 0) continue;
    env[line.slice(0, i)] = line.slice(i + 1);
  }
  return env;
}

const REQUIRED = ["headline", "summary", "article_body", "seo_title", "seo_description"];

function bundleComplete(bundle) {
  if (!bundle?.headline?.trim() || !bundle?.summary?.trim()) return false;
  return REQUIRED.every((field) => typeof bundle[field] === "string" && bundle[field].trim());
}

function hasTranslation(row, lang) {
  return bundleComplete(row.editorial_metadata?.translations?.[lang]);
}

const env = loadEnv();
const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY
);

async function countJobs(filter) {
  let query = supabase.from("worker_jobs").select("id", { count: "exact", head: true });
  for (const [key, value] of Object.entries(filter)) {
    query = query.eq(key, value);
  }
  const { count } = await query;
  return count ?? 0;
}

async function main() {
  const { data: articles, error } = await supabase
    .from("generated_articles")
    .select("id, language, editorial_metadata, published_at, editorial_status")
    .not("published_at", "is", null)
    .eq("editorial_status", "approved");

  if (error) {
    console.error(error.message);
    process.exit(1);
  }

  let publishedTotal = 0;
  let hiSource = 0;
  let enSource = 0;
  let hiMissingEn = 0;
  let enMissingHi = 0;
  let hiWithEn = 0;
  let incompleteBundles = 0;

  for (const row of articles ?? []) {
    publishedTotal += 1;
    const source = (row.language ?? "hi").toLowerCase();
    if (source === "hi") {
      hiSource += 1;
      if (hasTranslation(row, "en")) hiWithEn += 1;
      else hiMissingEn += 1;
    }
    if (source === "en") {
      enSource += 1;
      if (!hasTranslation(row, "hi")) enMissingHi += 1;
    }

    const enBundle = row.editorial_metadata?.translations?.en;
    const hiBundle = row.editorial_metadata?.translations?.hi;
    if (
      (enBundle?.headline?.trim() && !bundleComplete(enBundle)) ||
      (hiBundle?.headline?.trim() && !bundleComplete(hiBundle))
    ) {
      incompleteBundles += 1;
    }
  }

  const queueTranslatePending = await countJobs({
    job_type: "translate_article",
    status: "pending",
  });
  const queueBatchPending = await countJobs({
    job_type: "translation_batch",
    status: "pending",
  });

  const { count: queueDead } = await supabase
    .from("worker_jobs")
    .select("id", { count: "exact", head: true })
    .in("job_type", ["translate_article", "translation_batch"])
    .eq("status", "dead");

  const { count: deadLetters } = await supabase
    .from("worker_dead_letters")
    .select("id", { count: "exact", head: true })
    .in("job_type", ["translate_article", "translation_batch"]);

  const hiEnCoveragePct =
    hiSource > 0 ? Math.round((hiWithEn / hiSource) * 1000) / 10 : 100;

  const report = {
    publishedTotal,
    hiSource,
    enSource,
    hiMissingEn,
    enMissingHi,
    hiEnCoveragePct,
    incompleteBundles,
    queuePending: queueTranslatePending + queueBatchPending,
    queueTranslatePending,
    queueBatchPending,
    queueDead: queueDead ?? 0,
    deadLetters: deadLetters ?? 0,
  };

  console.log(JSON.stringify(report, null, 2));
}

main();
