#!/usr/bin/env npx tsx
/**
 * One-off Phase 5A final verification — NOT committed.
 * Requires real OPENAI_API_KEY; skips fallback samples from metrics.
 */

import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const LIMIT = 20;

function loadEnvFile(file: string, force = false) {
  const full = path.join(ROOT, file);
  if (!fs.existsSync(full)) return;
  for (const line of fs.readFileSync(full, "utf8").split(/\r?\n/)) {
    if (!line || line.startsWith("#")) continue;
    const i = line.indexOf("=");
    if (i < 0) continue;
    const key = line.slice(0, i).trim();
    const val = line.slice(i + 1).trim().replace(/^['"]|['"]$/g, "");
    if (!val || val.length < 8) continue;
    if (!force && process.env[key]?.trim()) continue;
    process.env[key] = val;
  }
}

loadEnvFile(".env.local", true);
loadEnvFile(".env.production.local");

if (!process.env.NEXT_PUBLIC_SITE_URL?.trim()) {
  process.env.NEXT_PUBLIC_SITE_URL = "https://newspaper-motion.vercel.app";
}

const FILLER_RE =
  /^##\s*(पृष्ठभूमि|क्षेत्रीय प्रभाव|निष्कर्ष|background|regional implications|conclusion)\s*$/im;

function avg(nums: number[]) {
  if (!nums.length) return 0;
  return Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 100) / 100;
}

function pct(flags: boolean[]) {
  if (!flags.length) return 0;
  return Math.round((flags.filter(Boolean).length / flags.length) * 100);
}

async function testOpenAiKey(): Promise<boolean> {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) return false;
  const res = await fetch("https://api.openai.com/v1/models", {
    headers: { Authorization: `Bearer ${key}` },
    signal: AbortSignal.timeout(15000),
  });
  console.log(`OpenAI key probe: HTTP ${res.status}, keyLen=${key.length}`);
  return res.ok;
}

async function main() {
  const { createAdminServerClient } = await import("../src/lib/supabase");
  const { analyzeEditorialBody, previewEditorialDraftFromEvent } = await import(
    "../src/lib/news/ai/generate-article"
  );
  const { resolveDeskTemplateFromCategory, getCategoryEditorialHint } = await import(
    "../src/lib/ai/prompts"
  );
  const { scoreHeadlineQuality } = await import("../src/lib/news/ai/editorial-intelligence");
  type NewsEventRow = import("../src/lib/types/newsroom").NewsEventRow;

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Missing Supabase env");
  }

  const keyOk = await testOpenAiKey();
  if (!keyOk) {
    throw new Error("OPENAI_API_KEY invalid — cannot run LLM verification");
  }

  process.env.NEWSROOM_GENERATE_ARTICLES = "true";

  function summaryQuality(summary: string): number {
    const len = summary.trim().length;
    if (len < 40) return 0.45;
    if (len > 320) return 0.7;
    const sentences = summary.split(/[.!?।]+/).filter((s) => s.trim().length > 5);
    return Math.round((sentences.length >= 1 && sentences.length <= 3 ? 0.88 : 0.72) * 100) / 100;
  }

  function bodyQuality(body: string, summary: string): number {
    const m = analyzeEditorialBody(body, summary);
    let s = 0.5;
    if (m.templateSectionCount === 0) s += 0.2;
    if (!m.hasDuplicateSummary) s += 0.15;
    if (m.fillerSectionCount === 0) s += 0.1;
    if (m.wordCount >= 60) s += 0.1;
    if (m.hasAttribution) s += 0.05;
    return Math.min(1, Math.round(s * 100) / 100);
  }

  function humanLikeness(m: ReturnType<typeof analyzeEditorialBody>): number {
    let s = 0.55;
    if (m.templateSectionCount === 0) s += 0.2;
    if (!m.hasDuplicateSummary) s += 0.15;
    if (m.hasAttribution) s += 0.1;
    if (m.fillerSectionCount === 0) s += 0.1;
    if (m.wordCount >= 80) s += 0.05;
    return Math.min(1, Math.round(s * 100) / 100);
  }

  function hasFillerSections(body: string): boolean {
    return (body.match(/^##\s+[^\n]+/gm) ?? []).some((h) => FILLER_RE.test(h));
  }

  const supabase = createAdminServerClient();
  const { data: articles } = await supabase
    .from("generated_articles")
    .select("id, headline, summary, article_body, event_id, created_at")
    .not("event_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(LIMIT);

  const eventIds = [...new Set((articles ?? []).map((a) => a.event_id).filter(Boolean))];
  const { data: events } = await supabase.from("news_events").select("*").in("id", eventIds);
  const eventMap = new Map((events ?? []).map((e) => [e.id, e as NewsEventRow]));

  type Sample = {
    eventId: string;
    category: string;
    deskTemplate: string;
    before: { headline: string; summary: string; body: string };
    after: { headline: string; summary: string; body: string };
  };

  const samples: Sample[] = [];
  let fallbackCount = 0;

  console.log(`\nGenerating ${LIMIT} LLM drafts from production events...\n`);

  for (const article of (articles ?? []).slice(0, LIMIT)) {
    const event = eventMap.get(article.event_id!);
    if (!event) continue;

    const preview = await previewEditorialDraftFromEvent(event);
    if (!preview.draft) {
      console.warn(`SKIP ${event.id}: ${preview.reason}`);
      continue;
    }
    if (preview.usedFallback) {
      fallbackCount++;
      console.warn(`FALLBACK ${event.id} — excluded from metrics`);
      continue;
    }

    const desk = resolveDeskTemplateFromCategory(event.category, {
      region: event.region,
      urgencyScore: event.urgency_score,
    });

    samples.push({
      eventId: event.id,
      category: event.category ?? "unknown",
      deskTemplate: desk,
      before: {
        headline: article.headline ?? "",
        summary: article.summary ?? "",
        body: article.article_body ?? "",
      },
      after: {
        headline: preview.draft.headline,
        summary: preview.draft.summary,
        body: preview.draft.article_body,
      },
    });

    console.log(`  LLM ✓ ${event.id} [${event.category} → ${desk}]`);
  }

  if (!samples.length) {
    throw new Error(`No LLM samples (${fallbackCount} fallbacks) — verification failed`);
  }

  const metrics = (rows: Sample[], which: "before" | "after") => ({
    headlineQuality: rows.map((r) => scoreHeadlineQuality(r[which].headline)),
    summaryQuality: rows.map((r) => summaryQuality(r[which].summary)),
    bodyQuality: rows.map((r) => bodyQuality(r[which].body, r[which].summary)),
    humanLikeness: rows.map((r) =>
      humanLikeness(analyzeEditorialBody(r[which].body, r[which].summary))
    ),
    wordCount: rows.map((r) => analyzeEditorialBody(r[which].body, r[which].summary).wordCount),
    templateSections: rows.map((r) =>
      analyzeEditorialBody(r[which].body, r[which].summary).templateSectionCount
    ),
    duplicateSummaries: rows.map((r) =>
      analyzeEditorialBody(r[which].body, r[which].summary).hasDuplicateSummary
    ),
    attribution: rows.map((r) =>
      analyzeEditorialBody(r[which].body, r[which].summary).hasAttribution
    ),
    fillerPresent: rows.map((r) => hasFillerSections(r[which].body)),
    deskTemplates: which === "after" ? rows.map((r) => r.deskTemplate) : [],
  });

  const before = metrics(samples, "before");
  const after = metrics(samples, "after");
  const deskUsage = after.deskTemplates.reduce<Record<string, number>>((acc, t) => {
    acc[t] = (acc[t] ?? 0) + 1;
    return acc;
  }, {});

  console.log("\n## METRIC COMPARISON (LLM-only after samples)\n");
  console.log("| Metric | Before | After | Δ |");
  console.log("|--------|--------|-------|---|");
  const table: Array<[string, number, number, string]> = [
    ["Headline quality", avg(before.headlineQuality), avg(after.headlineQuality), ""],
    ["Summary quality", avg(before.summaryQuality), avg(after.summaryQuality), ""],
    ["Body quality", avg(before.bodyQuality), avg(after.bodyQuality), ""],
    ["Human-likeness", avg(before.humanLikeness), avg(after.humanLikeness), ""],
    ["Avg length (words)", avg(before.wordCount), avg(after.wordCount), ""],
    ["Template sections", avg(before.templateSections), avg(after.templateSections), ""],
    ["Duplicate summaries %", pct(before.duplicateSummaries), pct(after.duplicateSummaries), "pp"],
    ["Attribution %", pct(before.attribution), pct(after.attribution), "pp"],
    ["Filler sections %", pct(before.fillerPresent), pct(after.fillerPresent), "pp"],
  ];
  for (const [name, b, a, unit] of table) {
    const delta = unit === "pp" ? `${a - b}pp` : (a - b).toFixed(2);
    console.log(`| ${name} | ${b} | ${a} | ${delta} |`);
  }

  console.log("\n## Category desk template usage (after)\n");
  for (const [k, v] of Object.entries(deskUsage).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${k}: ${v}`);
  }

  console.log("\n## Task 4 checks (after)\n");
  console.log(
    `  No filler sections: ${pct(after.fillerPresent) === 0 ? "PASS" : "FAIL"} (${pct(after.fillerPresent)}%)`
  );
  console.log(
    `  No duplicate summaries: ${pct(after.duplicateSummaries) === 0 ? "PASS" : "WARN"} (${pct(after.duplicateSummaries)}%)`
  );
  console.log(
    `  No template headings: ${avg(after.templateSections) === 0 ? "PASS" : "FAIL"} (avg ${avg(after.templateSections)})`
  );

  const humanGain = Math.round(
    ((avg(after.humanLikeness) - avg(before.humanLikeness)) /
      Math.max(0.01, avg(before.humanLikeness))) *
      100
  );
  console.log(`\nHuman quality improvement: ~${humanGain}% relative`);
  console.log(`LLM samples: ${samples.length}, fallbacks excluded: ${fallbackCount}`);

  console.log("\n## GENERATED EXAMPLES\n");
  for (let i = 0; i < samples.length; i++) {
    const s = samples[i];
    const hint = getCategoryEditorialHint(s.category);
    console.log(
      `--- ${i + 1}. ${s.eventId} (${s.category} → ${s.deskTemplate}${hint ? " + category hint" : ""}) ---`
    );
    console.log(`HEADLINE: ${s.after.headline}`);
    console.log(`SUMMARY: ${s.after.summary}`);
    console.log(`BODY:\n${s.after.body}\n`);
  }

  fs.writeFileSync(
    path.join(ROOT, "tmp-phase5a-verify-results.json"),
    JSON.stringify({ samples, before, after, deskUsage, humanGain, fallbackCount }, null, 2)
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
