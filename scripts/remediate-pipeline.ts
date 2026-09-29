/**
 * Pipeline data remediation — PLAN by default, APPLY only when told to.
 *
 *   pnpm exec tsx scripts/remediate-pipeline.ts                  # plan: read-only, writes remediation-plan.sql + prints counts
 *   pnpm exec tsx scripts/remediate-pipeline.ts --apply          # apply the plan (requires migrations 081-088 applied first)
 *   pnpm exec tsx scripts/remediate-pipeline.ts --only=geo,language   # subset: queue,orphans,language,junk,geo
 *
 * It uses the Supabase CLI session (`supabase db query --linked`), so no service key is read or stored.
 * Decisions come from the same deterministic classifiers the pipeline uses (geo-scope, script-detect,
 * headline-quality), so backfilled data matches what new articles get.
 *
 *  queue     news_ai_queue: stale (>48h) → rejected_stale; then fresh pending classified by geography
 *            (national/international → rejected_geo, unknown → quarantined) and duplicate titles → rejected_duplicate
 *  orphans   worker_jobs(editorial_generate) pending → dead (that lane generates directly; nothing claims them)
 *  language  generated_articles labelled 'en' whose headline is Devanagari → relabel 'hi' (content is Hindi)
 *  junk      published roundup / generic / placeholder headlines → editorial_status 'pending' (hidden, re-publishable)
 *  geo       backfill geo_metadata.scope/districts from text evidence, clearing false district tags
 */

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { classifyGeoScope, type GeoScope } from "../src/lib/news/geo/geo-scope";
import { evaluateHeadlineQuality } from "../src/lib/news/quality/headline-quality";
import { dominantScript } from "../src/lib/news/quality/script-detect";

const args = new Set(process.argv.slice(2));
const APPLY = args.has("--apply");
const onlyArg = [...args].find((a) => a.startsWith("--only="))?.slice(7).split(",") ?? null;
const want = (k: string) => !onlyArg || onlyArg.includes(k);
const OUT = path.resolve("remediation-plan.sql");

function query<T = Record<string, unknown>>(sql: string): T[] {
  const tmp = path.join(process.env.TEMP ?? ".", `rem-${Date.now()}-${Math.random().toString(36).slice(2)}.sql`);
  fs.writeFileSync(tmp, sql);
  try {
    const out = execFileSync("npx", ["--no-install", "supabase", "db", "query", "--linked", "-f", tmp, "-o", "json"], {
      encoding: "utf8",
      maxBuffer: 256 * 1024 * 1024,
      stdio: ["ignore", "pipe", "ignore"],
      shell: process.platform === "win32",
    });
    const j = JSON.parse(out.slice(out.indexOf("{"))) as { rows: T[] };
    return j.rows;
  } finally {
    fs.rmSync(tmp, { force: true });
  }
}

const q = (s: string | null | undefined) => (s === null || s === undefined ? "null" : `'${s.replace(/'/g, "''")}'`);
const idList = (ids: string[]) => ids.map((i) => q(i)).join(",");

const statements: string[] = [];
const summary: Record<string, number | string> = {};

// ---------------------------------------------------------------- queue
if (want("queue")) {
  const staleCount = Number(
    query<{ n: number }>(
      `select count(*)::int n from news_ai_queue q join news_articles a on a.id=q.article_id
        where q.status='pending' and coalesce(a.published_at,q.created_at) < now()-interval '48 hours'`
    )[0]?.n ?? 0
  );
  summary["queue.stale_to_reject"] = staleCount;
  statements.push(`select public.sweep_stale_ai_queue(48, 100000); -- rejects ${staleCount} stale pending items`);

  const fresh = query<{ qid: string; aid: number; title: string; description: string | null; region: string | null; title_hash: string | null; pub: string }>(
    `select q.id qid, a.id aid, a.title, left(a.description, 600) description, a.region, a.title_hash, a.published_at::text pub
       from news_ai_queue q join news_articles a on a.id=q.article_id
      where q.status='pending' and coalesce(a.published_at,q.created_at) >= now()-interval '48 hours'
      order by a.published_at desc`
  );
  const seenHash = new Set<string>();
  const byDecision: Record<string, string[]> = { rejected_geo: [], quarantined: [], rejected_duplicate: [] };
  for (const r of fresh) {
    if (r.title_hash) {
      if (seenHash.has(r.title_hash)) {
        byDecision.rejected_duplicate!.push(r.qid);
        continue;
      }
      seenHash.add(r.title_hash);
    }
    const g = classifyGeoScope({ title: r.title, description: r.description, region: r.region });
    if (g.scope === "NATIONAL" || g.scope === "INTERNATIONAL") byDecision.rejected_geo!.push(r.qid);
    else if (g.scope === "UNKNOWN") byDecision.quarantined!.push(r.qid);
  }
  summary["queue.fresh_pending_total"] = fresh.length;
  for (const [status, ids] of Object.entries(byDecision)) {
    summary[`queue.fresh_to_${status}`] = ids.length;
    if (ids.length) {
      statements.push(
        `update public.news_ai_queue set status='${status}', reject_reason='remediation:${status}', updated_at=now() where status='pending' and id in (${idList(ids)});`
      );
    }
  }
}

// ---------------------------------------------------------------- orphan worker jobs
if (want("orphans")) {
  const n = Number(query<{ n: number }>(`select count(*)::int n from worker_jobs where job_type='editorial_generate' and status='pending'`)[0]?.n ?? 0);
  summary["orphans.editorial_generate_pending"] = n;
  if (n) {
    statements.push(
      `update public.worker_jobs set status='dead', last_error=coalesce(last_error,'orphaned: editorial_generate runs as a direct lane'), updated_at=now() where job_type='editorial_generate' and status='pending';`
    );
  }
}

// ---------------------------------------------------------------- generated_articles: language / junk / geo
type Art = { id: string; language: string | null; headline: string; summary: string | null; article_body: string | null; editorial_status: string | null; geo: Record<string, unknown> | null; published_at: string | null };
const articles = query<Art>(
  `select id, language, headline, summary, left(article_body, 3000) article_body, editorial_status, geo_metadata geo, published_at::text
     from generated_articles where published_at is not null and published_at > now()-interval '31 days' order by published_at desc`
);

if (want("language")) {
  const fix = articles.filter((a) => a.language === "en" && dominantScript(a.headline) === "devanagari");
  const report = articles.filter((a) => a.language === "hi" && dominantScript(a.headline) === "latin");
  summary["language.relabel_en_to_hi"] = fix.length;
  summary["language.hi_with_latin_headline (report only)"] = report.length;
  if (fix.length) statements.push(`update public.generated_articles set language='hi' where id in (${idList(fix.map((a) => a.id))});`);
}

if (want("junk")) {
  const junk = articles.filter(
    (a) => ["approved", "published", "live"].includes(a.editorial_status ?? "approved") &&
      !evaluateHeadlineQuality({ headline: a.headline, language: dominantScript(a.headline) === "devanagari" ? "hi" : "en" }).ok
  );
  summary["junk.published_generic_or_placeholder"] = junk.length;
  if (junk.length) {
    statements.push(
      `update public.generated_articles set editorial_status='pending', workflow_status='draft', editorial_metadata = coalesce(editorial_metadata,'{}'::jsonb) || jsonb_build_object('remediation', jsonb_build_object('reason','generic_or_placeholder_headline','at',now())) where id in (${idList(junk.map((a) => a.id))});`
    );
  }
}

if (want("geo")) {
  let changed = 0;
  let clearedFalseDistrict = 0;
  const scopeCounts: Record<string, number> = {};
  for (const a of articles) {
    const g = classifyGeoScope({ title: a.headline, description: [a.summary, a.article_body].filter(Boolean).join("\n") });
    scopeCounts[g.scope] = (scopeCounts[g.scope] ?? 0) + 1;
    const prev = (a.geo ?? {}) as Record<string, unknown>;
    if (prev.scope === g.scope && (prev.primary_district ?? null) === g.districtSlug) continue;
    if (prev.primary_district && !g.districtSlug) clearedFalseDistrict++;
    changed++;
    const inCg = (["DISTRICT_SPECIFIC", "STATEWIDE_CHHATTISGARH", "INDIA_RELEVANT_TO_CHHATTISGARH"] as GeoScope[]).includes(g.scope);
    const patch = {
      scope: g.scope,
      scope_method: g.method,
      scope_confidence: g.confidence,
      scope_evidence: g.evidence.slice(0, 8),
      primary_district: g.districtSlug,
      districts: g.districts,
      is_chhattisgarh: inCg,
      state: inCg ? "chhattisgarh" : g.scope === "UNKNOWN" ? "unknown" : "india",
      backfilled_at: new Date().toISOString(),
    };
    statements.push(`update public.generated_articles set geo_metadata = coalesce(geo_metadata,'{}'::jsonb) || '${JSON.stringify(patch).replace(/'/g, "''")}'::jsonb where id='${a.id}';`);
  }
  summary["geo.articles_scanned"] = articles.length;
  summary["geo.rows_to_update"] = changed;
  summary["geo.false_district_tags_cleared"] = clearedFalseDistrict;
  summary["geo.scope_distribution"] = JSON.stringify(scopeCounts);
}

// ---------------------------------------------------------------- output
const header = `-- Pipeline remediation plan generated ${new Date().toISOString()}\n-- Review before applying. Requires migrations 081-088 (queue statuses, sweep function).\nbegin;\n`;
fs.writeFileSync(OUT, `${header}${statements.join("\n")}\ncommit;\n`);
console.log("\nPLAN (read-only so far)");
for (const [k, v] of Object.entries(summary)) console.log(`  ${k.padEnd(48)} ${v}`);
console.log(`\nSQL written to ${OUT} (${statements.length} statements)`);

if (!APPLY) {
  console.log("Dry run only. Re-run with --apply to execute it.");
} else {
  console.log("Applying…");
  execFileSync("npx", ["--no-install", "supabase", "db", "query", "--linked", "-f", OUT], { stdio: "inherit", shell: process.platform === "win32" });
  console.log("Applied.");
}
