#!/usr/bin/env npx tsx
/**
 * Phase 5D verification — coverage, queue, sample heroes.
 */

import fs from "node:fs";
import path from "node:path";
import { hasAiEditorialHero, getEditorialImageMeta } from "../src/lib/news/ai/editorial-image-terminal";

const ROOT = path.resolve(import.meta.dirname, "..");

for (const line of fs.readFileSync(path.join(ROOT, ".env.local"), "utf8").split(/\r?\n/)) {
  if (!line || line.startsWith("#")) continue;
  const i = line.indexOf("=");
  if (i < 0) continue;
  const k = line.slice(0, i).trim();
  const v = line.slice(i + 1).trim().replace(/^['"]|['"]$/g, "");
  if (v.length >= 8) process.env[k] = v;
}

async function main() {
  const { createAdminServerClient } = await import("../src/lib/supabase");
  const sb = createAdminServerClient();

  const { data: articles } = await sb
    .from("generated_articles")
    .select("id, slug, headline, hero_image_url, editorial_metadata, published_at")
    .not("published_at", "is", null)
    .order("published_at", { ascending: false })
    .limit(200);

  let ai = 0;
  let queued = 0;
  let source = 0;
  for (const row of articles ?? []) {
    if (hasAiEditorialHero(row)) ai++;
    const meta = getEditorialImageMeta(row.editorial_metadata);
    if (meta.status === "queued") queued++;
    if (meta.source === "source_extracted") source++;
  }

  const { count: pending } = await sb
    .from("editorial_image_queue")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");

  const { count: processing } = await sb
    .from("editorial_image_queue")
    .select("id", { count: "exact", head: true })
    .eq("status", "processing");

  const aiSamples = (articles ?? []).filter(hasAiEditorialHero).slice(0, 3);

  console.log(
    JSON.stringify(
      {
        last200: {
          aiHeroes: ai,
          aiPct: Math.round((ai / (articles?.length ?? 1)) * 1000) / 10,
          imageStatusQueued: queued,
          sourceExtracted: source,
        },
        queue: { pending, processing },
        aiSamples: aiSamples.map((r) => ({
          slug: r.slug,
          source: getEditorialImageMeta(r.editorial_metadata).source,
          hero: r.hero_image_url?.slice(0, 100),
        })),
      },
      null,
      2
    )
  );
}

main().catch(console.error);
