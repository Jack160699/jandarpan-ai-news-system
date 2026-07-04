#!/usr/bin/env node
/**
 * Backfill English translations for published Hindi generated_articles.
 *
 * Usage:
 *   node scripts/backfill-article-translations.mjs
 *   node scripts/backfill-article-translations.mjs --limit=20 --dry-run
 *   node scripts/backfill-article-translations.mjs --resume-from=2025-01-01T00:00:00.000Z
 *
 * Requires OPENAI_API_KEY, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY in .env.local
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

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, "").split("=");
    return [k, v ?? "true"];
  })
);

const limit = Number(args.limit ?? 60);
const dryRun = args["dry-run"] === "true";
const targetLang = args.lang ?? "en";
const resumeFrom = args["resume-from"] ?? null;
const stateFile = path.join(ROOT, ".translation-backfill-state.json");

const env = loadEnv();
if (!env.OPENAI_API_KEY?.trim()) {
  console.error("OPENAI_API_KEY required");
  process.exit(1);
}

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY
);

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const MODEL =
  env.NEWSROOM_TRANSLATION_MODEL?.trim() ||
  env.NEWSROOM_EDITORIAL_MODEL?.trim() ||
  "gpt-4o-mini";

const REQUIRED = ["headline", "summary", "article_body", "seo_title", "seo_description"];

function bundleComplete(bundle) {
  if (!bundle?.headline?.trim() || !bundle?.summary?.trim()) return false;
  return REQUIRED.every((field) => typeof bundle[field] === "string" && bundle[field].trim());
}

function hasTranslation(row, lang) {
  return bundleComplete(row.editorial_metadata?.translations?.[lang]);
}

function isTranslatable(row) {
  const headline = row.headline?.trim() ?? "";
  if (!headline || /^untitled story$/i.test(headline)) return false;
  return Boolean(row.summary?.trim() || row.article_body?.trim());
}

async function translateBundle(row) {
  const body = {
    model: MODEL,
    temperature: 0.25,
    max_tokens: 3200,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "You are a professional news translator. Translate JSON fields to English. Preserve markdown structure.",
      },
      {
        role: "user",
        content: `Translate to English:\n${JSON.stringify({
          headline: row.headline,
          summary: row.summary ?? "",
          article_body: (row.article_body ?? "").slice(0, 12000),
          seo_title: row.seo_title ?? row.headline,
          seo_description: row.seo_description ?? row.summary ?? "",
          tags: row.tags ?? [],
        })}\n\nReturn JSON with headline, summary, article_body, seo_title, seo_description, tags.`,
      },
    ],
  };

  const res = await fetch(OPENAI_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`OpenAI ${res.status}`);
  }

  const json = await res.json();
  const text = json.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error("empty response");
  const parsed = JSON.parse(text);
  if (!parsed.headline?.trim() || !parsed.summary?.trim()) {
    throw new Error("invalid bundle");
  }

  return {
    headline: parsed.headline.trim(),
    summary: parsed.summary.trim(),
    article_body: parsed.article_body?.trim() || row.article_body || "",
    seo_title: (parsed.seo_title?.trim() || parsed.headline).slice(0, 70),
    seo_description: (parsed.seo_description?.trim() || parsed.summary).slice(
      0,
      165
    ),
    tags: Array.isArray(parsed.tags)
      ? parsed.tags.map((t) => String(t).trim()).filter(Boolean)
      : row.tags ?? [],
    reading_time: row.reading_time ?? "3 min",
    translated_at: new Date().toISOString(),
    model: MODEL,
  };
}

async function audit() {
  const { data: rows } = await supabase
    .from("generated_articles")
    .select("id, language, editorial_metadata, published_at")
    .not("published_at", "is", null)
    .eq("editorial_status", "approved");

  let hiSource = 0;
  let hiMissingEn = 0;
  for (const row of rows ?? []) {
    if ((row.language ?? "hi").toLowerCase() !== "hi") continue;
    hiSource += 1;
    if (!hasTranslation(row, targetLang)) hiMissingEn += 1;
  }

  return {
    hiSource,
    hiMissingEn,
    hiEnCoveragePct:
      hiSource > 0
        ? Math.round(((hiSource - hiMissingEn) / hiSource) * 1000) / 10
        : 100,
  };
}

function readState() {
  if (!fs.existsSync(stateFile)) return null;
  try {
    return JSON.parse(fs.readFileSync(stateFile, "utf8"));
  } catch {
    return null;
  }
}

function writeState(state) {
  fs.writeFileSync(stateFile, JSON.stringify(state, null, 2));
}

async function main() {
  const before = await audit();
  console.log("Coverage before:", before);

  let query = supabase
    .from("generated_articles")
    .select(
      "id,slug,headline,summary,article_body,seo_title,seo_description,reading_time,language,tags,editorial_metadata,published_at"
    )
    .not("published_at", "is", null)
    .eq("editorial_status", "approved")
    .eq("language", "hi")
    .order("published_at", { ascending: false })
    .limit(Math.max(limit * 4, 200));

  if (resumeFrom) {
    query = query.lt("published_at", resumeFrom);
  }

  const { data: rows, error } = await query;
  if (error) {
    console.error(error.message);
    process.exit(1);
  }

  const candidates = (rows ?? []).filter(
    (row) => isTranslatable(row) && !hasTranslation(row, targetLang)
  );
  console.log(
    `Found ${candidates.length} Hindi articles missing ${targetLang} (processing up to ${limit})`
  );

  let ok = 0;
  let fail = 0;
  let skipped = 0;
  let lastPublishedAt = resumeFrom ?? null;

  for (const row of candidates.slice(0, limit)) {
    lastPublishedAt = row.published_at;
    process.stdout.write(`${row.slug} … `);

    if (hasTranslation(row, targetLang)) {
      skipped += 1;
      console.log("skip (already translated)");
      continue;
    }

    if (dryRun) {
      console.log("dry-run skip");
      continue;
    }

    try {
      const bundle = await translateBundle(row);
      const meta = row.editorial_metadata ?? {};
      const translations = { ...(meta.translations ?? {}), [targetLang]: bundle };
      const { error: upErr } = await supabase
        .from("generated_articles")
        .update({
          translations,
          editorial_metadata: {
            ...meta,
            translations,
            translations_updated_at: new Date().toISOString(),
          },
        })
        .eq("id", row.id);

      if (upErr) throw upErr;
      ok += 1;
      console.log("ok");
      writeState({
        lastPublishedAt: row.published_at,
        lastSlug: row.slug,
        updatedAt: new Date().toISOString(),
      });
      await new Promise((r) => setTimeout(r, 500));
    } catch (err) {
      fail += 1;
      console.log(`fail (${err.message})`);
    }
  }

  const after = await audit();
  console.log("Coverage after:", after);
  console.log(
    `Done. ok=${ok} fail=${fail} skipped=${skipped} dryRun=${dryRun} resumeCursor=${lastPublishedAt ?? "none"}`
  );
}

main();
