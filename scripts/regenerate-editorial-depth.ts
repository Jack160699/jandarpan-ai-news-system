#!/usr/bin/env npx tsx
/**
 * Optional regeneration for short published articles.
 *
 * DEFAULT: dry-run (no writes).
 * Apply requires explicit --apply AND never targets live Production overwrite
 * without a version backup record.
 *
 * Safety:
 * - dry-run default
 * - bounded --limit batch
 * - requires resolvable source signals / event_id
 * - skips thin-evidence / legally risky categories without enough sources
 * - estimates generation cost
 * - --apply writes a version backup into editorial_metadata before replace
 *
 * Usage:
 *   npx tsx scripts/regenerate-editorial-depth.ts
 *   npx tsx scripts/regenerate-editorial-depth.ts --limit 20
 *   npx tsx scripts/regenerate-editorial-depth.ts --limit 5 --apply
 *
 * Do NOT run --apply against Production from CI without human approval.
 */

import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import {
  auditEditorialDepthRow,
  ESTIMATED_REGEN_COST_USD,
  type EditorialDepthAuditRow,
} from "../src/lib/news/ai/editorial-depth-audit";
import { classifyArticleType } from "../src/lib/news/ai/article-type";

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

const RISKY_CATEGORY_RE = /\b(crime|court|legal|defamation|suicide|communal|riots?)\b/i;

function parseArgs(argv: string[]) {
  const limitIdx = argv.indexOf("--limit");
  const outIdx = argv.indexOf("--out");
  return {
    apply: argv.includes("--apply"),
    limit: Math.min(limitIdx >= 0 ? Number(argv[limitIdx + 1]) || 25 : 25, 50),
    out:
      outIdx >= 0
        ? argv[outIdx + 1]
        : path.join(
            ROOT,
            "reports",
            `editorial-depth-regen-${argv.includes("--apply") ? "apply" : "dryrun"}-${Date.now()}.json`
          ),
  };
}

type Candidate = {
  articleId: string;
  eventId: string | null;
  headline: string | null;
  codes: string[];
  skipReason?: string;
  estimatedCostUsd: number;
};

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  if (args.apply && process.env.ALLOW_EDITORIAL_DEPTH_REGEN !== "true") {
    console.error(
      "Refusing --apply: set ALLOW_EDITORIAL_DEPTH_REGEN=true to confirm non-Production use."
    );
    process.exit(1);
  }

  const supabase = createClient(url, key);
  const { data, error } = await supabase
    .from("generated_articles")
    .select(
      "id, event_id, headline, summary, article_body, language, editorial_metadata, published_at"
    )
    .not("published_at", "is", null)
    .order("published_at", { ascending: false })
    .limit(Math.max(args.limit * 4, 100));

  if (error) {
    console.error(error.message);
    process.exit(1);
  }

  const candidates: Candidate[] = [];
  for (const raw of data ?? []) {
    if (candidates.length >= args.limit) break;
    const meta =
      raw.editorial_metadata && typeof raw.editorial_metadata === "object"
        ? (raw.editorial_metadata as Record<string, unknown>)
        : {};
    const row: EditorialDepthAuditRow & { event_id?: string | null } = {
      id: raw.id,
      headline: raw.headline,
      summary: raw.summary,
      article_body: raw.article_body,
      language: raw.language,
      editorial_metadata: meta,
      published_at: raw.published_at,
      category: typeof meta.category === "string" ? meta.category : null,
      region: typeof meta.region === "string" ? meta.region : null,
      source_count:
        typeof meta.source_count === "number" ? meta.source_count : null,
      event_id: raw.event_id,
    };
    const finding = auditEditorialDepthRow(row);
    if (!finding) continue;

    const eventId = row.event_id ?? null;
    let skipReason: string | undefined;

    if (!eventId) {
      skipReason = "missing_event_id";
    } else if (
      RISKY_CATEGORY_RE.test(row.category ?? "") &&
      (row.source_count ?? 0) < 2
    ) {
      skipReason = "insufficient_evidence_sensitive_category";
    } else {
      const classification = classifyArticleType({
        signalCount: row.source_count ?? 1,
        factPackChars: (row.article_body ?? "").length,
        category: row.category,
        canonicalTitle: row.headline,
        eventSummary: row.summary,
      });
      if (
        !classification.evidenceSufficient &&
        finding.codes.includes("body_shorter_than_type_threshold")
      ) {
        if (!finding.codes.includes("body_equals_excerpt")) {
          skipReason = "insufficient_source_evidence";
        }
      }
    }

    candidates.push({
      articleId: row.id,
      eventId,
      headline: row.headline,
      codes: finding.codes,
      skipReason,
      estimatedCostUsd: ESTIMATED_REGEN_COST_USD,
    });
  }

  const actionable = candidates.filter((c) => !c.skipReason);
  const skipped = candidates.filter((c) => c.skipReason);
  const estimatedCostUsd =
    Math.round(actionable.length * ESTIMATED_REGEN_COST_USD * 1000) / 1000;

  const applied: Array<{ articleId: string; ok: boolean; reason?: string }> = [];

  if (args.apply) {
    const { previewEditorialDraftFromEvent } = await import(
      "../src/lib/news/ai/generate-article"
    );
    const { validateEditorialDepth } = await import(
      "../src/lib/news/ai/editorial-depth-quality"
    );

    for (const c of actionable) {
      if (!c.eventId) continue;

      const { data: event, error: eventErr } = await supabase
        .from("news_events")
        .select("*")
        .eq("id", c.eventId)
        .maybeSingle();

      if (eventErr || !event) {
        applied.push({
          articleId: c.articleId,
          ok: false,
          reason: "event_not_found",
        });
        continue;
      }

      const { data: existing } = await supabase
        .from("generated_articles")
        .select("id, headline, summary, article_body, editorial_metadata")
        .eq("id", c.articleId)
        .maybeSingle();

      if (!existing) {
        applied.push({ articleId: c.articleId, ok: false, reason: "article_missing" });
        continue;
      }

      const preview = await previewEditorialDraftFromEvent(event as never);
      if (!preview.draft) {
        applied.push({
          articleId: c.articleId,
          ok: false,
          reason: preview.reason ?? "preview_failed",
        });
        continue;
      }

      const classification = classifyArticleType({
        urgencyScore: (event as { urgency_score?: number }).urgency_score,
        signalCount: (event as { source_count?: number }).source_count ?? 2,
        factPackChars: preview.draft.article_body.length,
        category: (event as { category?: string }).category,
        canonicalTitle: (event as { canonical_title?: string }).canonical_title,
      });

      const depth = validateEditorialDepth({
        articleBody: preview.draft.article_body,
        summary: preview.draft.summary,
        articleType: classification.type,
        factPackText: preview.draft.article_body,
        language: preview.draft.language,
        evidenceSufficient: classification.evidenceSufficient,
      });

      if (!depth.ok) {
        applied.push({
          articleId: c.articleId,
          ok: false,
          reason: `depth_rejected:${depth.codes.join(",")}`,
        });
        continue;
      }

      const backup = {
        backed_up_at: new Date().toISOString(),
        headline: existing.headline,
        summary: existing.summary,
        article_body: existing.article_body,
      };

      const prevMeta =
        existing.editorial_metadata &&
        typeof existing.editorial_metadata === "object"
          ? (existing.editorial_metadata as Record<string, unknown>)
          : {};

      const { error: updErr } = await supabase
        .from("generated_articles")
        .update({
          headline: preview.draft.headline,
          summary: preview.draft.summary,
          article_body: preview.draft.article_body,
          seo_title: preview.draft.seo_title,
          seo_description: preview.draft.seo_description,
          reading_time: preview.draft.reading_time,
          tags: preview.draft.tags,
          editorial_metadata: {
            ...prevMeta,
            depth_regen_backup: backup,
            depth_regenerated_at: new Date().toISOString(),
            article_type: classification.type,
          },
        })
        .eq("id", c.articleId);

      applied.push({
        articleId: c.articleId,
        ok: !updErr,
        reason: updErr?.message,
      });
    }
  }

  const report = {
    dryRun: !args.apply,
    limit: args.limit,
    scannedCandidates: candidates.length,
    actionable: actionable.length,
    skipped: skipped.length,
    estimatedCostUsd,
    estimatedCostNote:
      "~$0.004/article gpt-4o-mini estimate; actual varies with token tier",
    candidates,
    applied: args.apply ? applied : [],
    generatedAt: new Date().toISOString(),
  };

  fs.mkdirSync(path.dirname(args.out), { recursive: true });
  fs.writeFileSync(args.out, JSON.stringify(report, null, 2), "utf8");
  console.log(JSON.stringify({ ...report, out: args.out }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
