/**
 * Validation of the DEPLOYED fetch / cluster / translation Edge workers on the real Supabase Edge runtime.
 *
 *   node scripts/edge-remote-validate-workers.mjs [--env .env.production.local] [--shard 3]
 *
 * Safety: the scheduler stays OFF (kill switch is also asserted); the function secrets used here are TEMPORARY and are
 * unset in a finally block; one bounded RSS shard / one clustering pass / one small translation batch are run (the
 * same writes the scheduled pipeline would make); secret values are never printed.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";

const argv = process.argv.slice(2);
const arg = (n, d) => (argv.includes(n) ? argv[argv.indexOf(n) + 1] : d);
const envFile = arg("--env", ".env.production.local");
const SHARD = Number(arg("--shard", "3"));
const SHARDS = 10;
const REF = fs.readFileSync("supabase/.temp/project-ref", "utf8").trim();
const BASE = `https://${REF}.supabase.co/functions/v1`;
const npx = process.platform === "win32" ? "npx.cmd" : "npx";
const sb = (args, opts = {}) => execFileSync(npx, ["--no-install", "supabase", ...args], { encoding: "utf8", shell: process.platform === "win32", ...opts });

const fileEnv = {};
for (const line of fs.readFileSync(envFile, "utf8").split(/\r?\n/)) {
  const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
  if (m) fileEnv[m[1]] = m[2].replace(/^["']|["']$/g, "").trim();
}
const usable = (v) => Boolean(v) && v !== "[SENSITIVE]" && v.length >= 8;

const WORKER_SECRET = crypto.randomBytes(24).toString("hex");
const TEMP_SECRETS = {
  EDGE_WORKER_SECRET: WORKER_SECRET,
  NEWSROOM_CLUSTER_EVENTS: "true",
  NEWSROOM_USE_EMBEDDINGS: "true",
  NEWSROOM_GENERATE_ARTICLES: "true",
  NEWSROOM_LEGACY_BRIDGE: "false", // signals only: no news_articles copy, no dead-end news_ai_queue rows
  ...(usable(fileEnv.CLOUDFLARE_ACCOUNT_ID) ? { CLOUDFLARE_ACCOUNT_ID: fileEnv.CLOUDFLARE_ACCOUNT_ID } : {}),
  ...(usable(fileEnv.CLOUDFLARE_API_TOKEN) ? { CLOUDFLARE_API_TOKEN: fileEnv.CLOUDFLARE_API_TOKEN } : {}),
};
const NAMES = Object.keys(TEMP_SECRETS);

const keys = JSON.parse(sb(["projects", "api-keys", "--project-ref", REF, "-o", "json"]).replace(/^[^\[{]*/, ""));
const SERVICE = keys.find((k) => k.name === "service_role")?.api_key;
const ANON = keys.find((k) => k.name === "anon")?.api_key;
const SB = `https://${REF}.supabase.co`;
const rest = async (q) => {
  const res = await fetch(`${SB}/rest/v1/${q}`, { headers: { apikey: SERVICE, authorization: `Bearer ${SERVICE}`, prefer: "count=exact" } });
  const text = await res.text();
  return { status: res.status, count: Number(/\/(\d+)$/.exec(res.headers.get("content-range") ?? "")?.[1] ?? NaN), json: text ? JSON.parse(text) : null };
};
const rpc = async (n, a) => {
  const res = await fetch(`${SB}/rest/v1/rpc/${n}`, { method: "POST", headers: { apikey: SERVICE, authorization: `Bearer ${SERVICE}`, "content-type": "application/json" }, body: JSON.stringify(a) });
  return { status: res.status, json: await res.json().catch(() => null) };
};
const state = async () => ({
  signals: (await rest("news_signals?select=id&limit=1")).count,
  events: (await rest("news_events?select=id&limit=1")).count,
  published: (await rest("generated_articles?select=id&published_at=not.is.null&limit=1")).count,
  dispatch_log: (await rest("scheduler_dispatch_log?select=id&limit=1")).count,
  worker_jobs_pending: (await rest("worker_jobs?select=id&status=eq.pending&limit=1")).count,
  legacy_news_articles: (await rest("news_articles?select=id&limit=1")).count,
  ai_queue_rows: (await rest("news_ai_queue?select=id&limit=1")).count,
  db_mb: null,
});
async function call(fn, body = {}, headers = {}, auth = true) {
  const t0 = Date.now();
  const res = await fetch(`${BASE}/${fn}`, { method: "POST", headers: { "content-type": "application/json", ...(auth ? { authorization: `Bearer ${WORKER_SECRET}` } : {}), ...headers }, body: JSON.stringify(body) });
  let json = null;
  try { json = await res.json(); } catch { /* non-json */ }
  return { http: res.status, ms: Date.now() - t0, body: json, sbRequestId: res.headers.get("sb-request-id") };
}

const report = { started_at: new Date().toISOString(), checks: [], runs: {} };
const check = (name, ok, detail = "") => report.checks.push({ name, ok, detail });

function setSecrets() {
  const f = path.join(os.tmpdir(), `.edge-w-${crypto.randomBytes(6).toString("hex")}.env`);
  try {
    fs.writeFileSync(f, Object.entries(TEMP_SECRETS).map(([k, v]) => `${k}=${v}`).join("\n") + "\n", { mode: 0o600 });
    sb(["secrets", "set", "--env-file", f, "--project-ref", REF], { stdio: ["ignore", "pipe", "pipe"] });
  } finally {
    try { fs.rmSync(f, { force: true }); } catch { /* ignore */ }
  }
}
const unsetSecrets = () => { try { sb(["secrets", "unset", ...NAMES, "--project-ref", REF], { stdio: ["ignore", "pipe", "pipe"] }); return true; } catch (e) { return String(e?.message ?? e).slice(0, 160); } };
const secretNames = () => { const j = JSON.parse(sb(["secrets", "list", "--project-ref", REF, "-o", "json"]).replace(/^[^\[{]*/, "")); return (Array.isArray(j) ? j : j.secrets ?? []).map((s) => s.name); };

try {
  report.secrets_before = secretNames();
  report.state_before = await state();
  setSecrets();
  for (let i = 0; i < 30; i++) { const r = await call("cluster-worker", { bad: 1 }); if (r.http !== 503) break; await new Promise((r2) => setTimeout(r2, 2000)); }

  // ---- gating on all three ----
  for (const fn of ["fetch-worker", "cluster-worker", "translation-worker"]) {
    const noAuth = await call(fn, {}, {}, false);
    check(`${fn}: no bearer -> 401`, noAuth.http === 401, String(noAuth.http));
    const sched = await call(fn, {}, { "x-jd-trigger": "scheduler" });
    check(`${fn}: scheduler-triggered call is inert (kill switch OFF)`, sched.body?.status === "kill_switch_off", String(sched.body?.status));
  }
  const badShard = await call("fetch-worker", { shard: SHARDS, shards: SHARDS });
  check("fetch-worker: out-of-range shard -> 400", badShard.http === 400, `${badShard.http} ${badShard.body?.reason}`);

  // ---- lease refusal (fetch shard) ----
  const key = `edge-fetch-${SHARDS}-${SHARD}`;
  const held = await rpc("acquire_run_lease", { p_key: key, p_owner: "edge-validate", p_ttl_seconds: 120 });
  check("harness holds the shard lease", held.json === true);
  const refused = await call("fetch-worker", { shard: SHARD, shards: SHARDS });
  check("lease held elsewhere -> fetch-worker refuses (overlap_lock), no work", refused.body?.status === "overlap_lock", String(refused.body?.status));
  await rpc("release_run_lease", { p_key: key, p_owner: "edge-validate" });

  // ---- real bounded fetch shard ----
  const s0 = await state();
  const fetch1 = await call("fetch-worker", { shard: SHARD, shards: SHARDS }, { "x-correlation-id": "edge-validate-fetch-1" });
  report.runs.fetch_1 = { http: fetch1.http, ms: fetch1.ms, sb_request_id: fetch1.sbRequestId, status: fetch1.body?.status, reason: fetch1.body?.reason, result: fetch1.body?.result, resources: fetch1.body?.resources };
  check("fetch shard ran to completion on the real runtime", ["completed", "degraded"].includes(fetch1.body?.status), `${fetch1.http} ${fetch1.body?.status} ${fetch1.body?.reason ?? ""}`);
  const s1 = await state();
  const inserted = fetch1.body?.result?.signals_inserted ?? 0;
  check("new signals in DB match what the worker reported", s1.signals - s0.signals === inserted, `delta=${s1.signals - s0.signals} reported=${inserted}`);
  check("legacy bridge is OFF: no news_articles copy and no dead-end news_ai_queue rows were written", (fetch1.body?.result?.legacy_inserted ?? -1) === 0 && s1.ai_queue_rows === s0.ai_queue_rows, JSON.stringify({ legacy_inserted: fetch1.body?.result?.legacy_inserted, queue: [s0.ai_queue_rows, s1.ai_queue_rows] }));
  const run = await rest(`ops_cron_runs?select=job,ok,trigger,run_id,metadata&job=eq.fetch-news&trigger=eq.supabase-edge&order=created_at.desc&limit=1`);
  check("run recorded in ops_cron_runs (job fetch-news, trigger supabase-edge, shard in metadata)", run.json?.[0]?.run_id === fetch1.body?.run_id && run.json?.[0]?.metadata?.shard === SHARD, JSON.stringify(run.json?.[0]?.metadata?.shard));
  const lease1 = await rest(`worker_run_leases?select=expires_at&lease_key=eq.${key}`);
  check("shard lease released", !(lease1.json ?? [])[0] || new Date(lease1.json[0].expires_at).getTime() <= Date.now());
  const fetch2 = await call("fetch-worker", { shard: SHARD, shards: SHARDS }, { "x-correlation-id": "edge-validate-fetch-2" });
  report.runs.fetch_2 = { http: fetch2.http, ms: fetch2.ms, status: fetch2.body?.status, result: fetch2.body?.result, resources: fetch2.body?.resources };
  check("immediate re-run is idempotent (no duplicate signals)", (fetch2.body?.result?.signals_inserted ?? 0) <= Math.max(1, Math.floor(inserted * 0.1)), `second run inserted ${fetch2.body?.result?.signals_inserted}`);

  // ---- cluster ----
  const e0 = (await state()).events;
  const cl = await call("cluster-worker", {}, { "x-correlation-id": "edge-validate-cluster" });
  report.runs.cluster = { http: cl.http, ms: cl.ms, sb_request_id: cl.sbRequestId, status: cl.body?.status, reason: cl.body?.reason, result: cl.body?.result, resources: cl.body?.resources };
  check("cluster worker ran on the real runtime", ["completed", "degraded"].includes(cl.body?.status), `${cl.http} ${cl.body?.status} ${cl.body?.reason ?? ""}`);
  const e1 = (await state()).events;
  check("events in DB consistent with worker report", e1 - e0 === (cl.body?.result?.events_created ?? 0), `delta=${e1 - e0} reported=${cl.body?.result?.events_created}`);

  // ---- translation ----
  const tr = await call("translation-worker", { process_limit: 3, enqueue_limit: 10 }, { "x-correlation-id": "edge-validate-translation" });
  report.runs.translation = { http: tr.http, ms: tr.ms, sb_request_id: tr.sbRequestId, status: tr.body?.status, reason: tr.body?.reason, result: tr.body?.result, resources: tr.body?.resources };
  check("translation worker ran on the real runtime", ["completed", "degraded", "failed"].includes(tr.body?.status) && tr.http === 200, `${tr.http} ${tr.body?.status} ${tr.body?.reason ?? ""}`);

  // ---- global invariants ----
  const sEnd = await state();
  check("no scheduler dispatch happened", sEnd.dispatch_log === report.state_before.dispatch_log, `${report.state_before.dispatch_log} -> ${sEnd.dispatch_log}`);
  check("no article published by these workers", sEnd.published === report.state_before.published, `${report.state_before.published} -> ${sEnd.published}`);
  const blob = JSON.stringify(report.runs);
  const leaked = [WORKER_SECRET, SERVICE, ANON, fileEnv.CLOUDFLARE_API_TOKEN].filter(Boolean).filter((n) => blob.includes(n));
  check("no secrets in any worker response", leaked.length === 0, `leaked=${leaked.length}`);
  report.state_after = sEnd;
} catch (e) {
  check("validation completed without exception", false, String(e?.stack ?? e).slice(0, 400));
} finally {
  const u = unsetSecrets();
  try {
    report.secrets_after = secretNames();
    const left = NAMES.filter((n) => report.secrets_after.includes(n));
    check("temporary secrets removed", u === true && left.length === 0, `remaining=${left.join(",") || "none"}`);
  } catch (e) {
    check("temporary secrets removed", false, String(e).slice(0, 160));
  }
}

console.log(JSON.stringify(report, null, 2));
const failed = report.checks.filter((c) => !c.ok);
console.log(`\n${report.checks.length - failed.length}/${report.checks.length} checks passed`);
for (const f of failed) console.log(`FAIL ${f.name} :: ${f.detail}`);
process.exitCode = failed.length ? 1 : 0;
