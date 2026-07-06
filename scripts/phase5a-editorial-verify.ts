#!/usr/bin/env npx tsx
/**
 * Phase 5A — Compare stored articles vs new editorial prompt output.
 *
 * Usage:
 *   npx tsx scripts/phase5a-editorial-verify.ts
 *   npx tsx scripts/phase5a-editorial-verify.ts --limit 5
 *
 * Requires: OPENAI_API_KEY, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

import fs from "node:fs";
import path from "node:path";
import { createAdminServerClient } from "../src/lib/supabase";
import {
  analyzeEditorialBody,
  previewEditorialDraftFromEvent,
} from "../src/lib/news/ai/generate-article";
import { scoreHeadlineQuality } from "../src/lib/news/ai/editorial-intelligence";
import type { NewsEventRow } from "../src/lib/types/newsroom";

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

function avg(nums: number[]): number {
  if (!nums.length) return 0;
  return Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 100) / 100;
}

function pctTrue(flags: boolean[]): number {
  if (!flags.length) return 0;
  return Math.round((flags.filter(Boolean).length / flags.length) * 100);
}

function readabilityScore(text: string): number {
  const words = text.split(/\s+/).filter(Boolean);
  if (!words.length) return 0;
  const sentences = text.split(/[.!?।]+/).filter((s) => s.trim().length > 3);
  const avgWords = words.length / Math.max(1, sentences.length);
  const ideal = avgWords >= 8 && avgWords <= 22;
  const hasTemplate = /^##\s+(सारांश|summary|background)/im.test(text);
  let score = ideal ? 0.85 : avgWords < 8 ? 0.65 : 0.72;
  if (hasTemplate) score -= 0.15;
  return Math.round(score * 100) / 100;
}

function humanLikeness(metrics: ReturnType<typeof analyzeEditorialBody>): number {
  let score = 0.55;
  if (metrics.templateSectionCount === 0) score += 0.2;
  if (!metrics.hasDuplicateSummary) score += 0.15;
  if (metrics.hasAttribution) score += 0.1;
  if (metrics.fillerSectionCount === 0) score += 0.1;
  if (metrics.wordCount >= 80) score += 0.05;
  return Math.min(1, Math.round(score * 100) / 100);
}

async function main() {
  const limitArg = process.argv.find((a) => a.startsWith("--limit"));
  const limit = limitArg ? Number(limitArg.split("=")[1] ?? process.argv[process.argv.indexOf(limitArg) + 1]) : 20;

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error("Missing Supabase env");
    process.exit(1);
  }
  if (!process.env.OPENAI_API_KEY?.trim()) {
    console.error("Missing OPENAI_API_KEY — cannot generate after samples");
    process.exit(1);
  }

  process.env.NEWSROOM_GENERATE_ARTICLES = "true";

  const supabase = createAdminServerClient();
  const { data: articles, error } = await supabase
    .from("generated_articles")
    .select("id, headline, summary, article_body, event_id, created_at")
    .not("event_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !articles?.length) {
    console.error("No articles found:", error?.message);
    process.exit(1);
  }

  const eventIds = [...new Set(articles.map((a) => a.event_id).filter(Boolean))].slice(
    0,
    limit
  );

  const { data: events } = await supabase
    .from("news_events")
    .select("*")
    .in("id", eventIds);

  const eventMap = new Map((events ?? []).map((e) => [e.id, e as NewsEventRow]));

  const before = {
    headlineQuality: [] as number[],
    humanLikeness: [] as number[],
    readability: [] as number[],
    wordCount: [] as number[],
    templateSections: [] as number[],
    fillerSections: [] as number[],
    duplicateSummaries: [] as boolean[],
    attribution: [] as boolean[],
  };

  const after = {
    headlineQuality: [] as number[],
    humanLikeness: [] as number[],
    readability: [] as number[],
    wordCount: [] as number[],
    templateSections: [] as number[],
    fillerSections: [] as number[],
    duplicateSummaries: [] as boolean[],
    attribution: [] as boolean[],
  };

  const examples: Array<{
    eventId: string;
    beforeHeadline: string;
    afterHeadline: string;
    beforeBodySnippet: string;
    afterBodySnippet: string;
  }> = [];

  console.log(`\nPhase 5A verification — ${eventIds.length} production events\n`);

  for (const article of articles.slice(0, limit)) {
    const event = eventMap.get(article.event_id!);
    if (!event) continue;

    const beforeMetrics = analyzeEditorialBody(
      article.article_body ?? "",
      article.summary ?? ""
    );
    before.headlineQuality.push(scoreHeadlineQuality(article.headline ?? ""));
    before.humanLikeness.push(humanLikeness(beforeMetrics));
    before.readability.push(readabilityScore(article.article_body ?? ""));
    before.wordCount.push(beforeMetrics.wordCount);
    before.templateSections.push(beforeMetrics.templateSectionCount);
    before.fillerSections.push(beforeMetrics.fillerSectionCount);
    before.duplicateSummaries.push(beforeMetrics.hasDuplicateSummary);
    before.attribution.push(beforeMetrics.hasAttribution);

    const preview = await previewEditorialDraftFromEvent(event);
    if (!preview.draft) {
      console.warn(`  skip ${event.id}: ${preview.reason ?? "no draft"}`);
      continue;
    }

    const afterMetrics = analyzeEditorialBody(
      preview.draft.article_body,
      preview.draft.summary
    );
    after.headlineQuality.push(scoreHeadlineQuality(preview.draft.headline));
    after.humanLikeness.push(humanLikeness(afterMetrics));
    after.readability.push(readabilityScore(preview.draft.article_body));
    after.wordCount.push(afterMetrics.wordCount);
    after.templateSections.push(afterMetrics.templateSectionCount);
    after.fillerSections.push(afterMetrics.fillerSectionCount);
    after.duplicateSummaries.push(afterMetrics.hasDuplicateSummary);
    after.attribution.push(afterMetrics.hasAttribution);

    if (examples.length < 3) {
      examples.push({
        eventId: event.id,
        beforeHeadline: article.headline ?? "",
        afterHeadline: preview.draft.headline,
        beforeBodySnippet: (article.article_body ?? "").slice(0, 280),
        afterBodySnippet: preview.draft.article_body.slice(0, 280),
      });
    }

    console.log(`  ✓ ${event.id} (${event.category})`);
  }

  const n = after.wordCount.length;
  console.log("\n## Comparison table (before stored → after Phase 5A preview)\n");
  console.log("| Metric | Before | After | Δ |");
  console.log("|--------|--------|-------|---|");
  console.log(
    `| Headline quality (0-1) | ${avg(before.headlineQuality)} | ${avg(after.headlineQuality)} | ${(avg(after.headlineQuality) - avg(before.headlineQuality)).toFixed(2)} |`
  );
  console.log(
    `| Human-likeness (0-1) | ${avg(before.humanLikeness)} | ${avg(after.humanLikeness)} | ${(avg(after.humanLikeness) - avg(before.humanLikeness)).toFixed(2)} |`
  );
  console.log(
    `| Readability (0-1) | ${avg(before.readability)} | ${avg(after.readability)} | ${(avg(after.readability) - avg(before.readability)).toFixed(2)} |`
  );
  console.log(
    `| Avg article length (words) | ${avg(before.wordCount)} | ${avg(after.wordCount)} | ${(avg(after.wordCount) - avg(before.wordCount)).toFixed(0)} |`
  );
  console.log(
    `| Avg template sections | ${avg(before.templateSections)} | ${avg(after.templateSections)} | ${(avg(after.templateSections) - avg(before.templateSections)).toFixed(1)} |`
  );
  console.log(
    `| Empty filler sections | ${avg(before.fillerSections)} | ${avg(after.fillerSections)} | ${(avg(after.fillerSections) - avg(before.fillerSections)).toFixed(1)} |`
  );
  console.log(
    `| Duplicate summaries | ${pctTrue(before.duplicateSummaries)}% | ${pctTrue(after.duplicateSummaries)}% | ${pctTrue(after.duplicateSummaries) - pctTrue(before.duplicateSummaries)}pp |`
  );
  console.log(
    `| Attribution present | ${pctTrue(before.attribution)}% | ${pctTrue(after.attribution)}% | ${pctTrue(after.attribution) - pctTrue(before.attribution)}pp |`
  );
  console.log(`\nSamples compared: ${n}`);

  if (examples.length) {
    console.log("\n## Before vs after examples\n");
    for (const ex of examples) {
      console.log(`### Event ${ex.eventId}`);
      console.log(`**Before headline:** ${ex.beforeHeadline}`);
      console.log(`**After headline:** ${ex.afterHeadline}`);
      console.log(`**Before body:** ${ex.beforeBodySnippet}…`);
      console.log(`**After body:** ${ex.afterBodySnippet}…\n`);
    }
  }

  const humanGain =
    Math.round(((avg(after.humanLikeness) - avg(before.humanLikeness)) / Math.max(0.01, avg(before.humanLikeness))) * 100);
  console.log(`\nEstimated human quality improvement: ~${humanGain}% relative gain on human-likeness composite.\n`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
