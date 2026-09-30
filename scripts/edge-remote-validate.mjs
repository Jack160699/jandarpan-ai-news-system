/**
 * Controlled validation of the DEPLOYED Supabase Edge function `editorial-worker` (real Supabase Edge runtime).
 *
 *   node scripts/edge-remote-validate.mjs [--env .env.production.local] [--max-candidates 2]
 *
 * Safety model:
 *  - test mode only, one selected event per call, dry_run=true (no article / run record / attempt row is written);
 *  - dedicated test lease key; the real "editorial-generate" lease is never taken;
 *  - the scheduler is never enabled and no Vault secret is touched;
 *  - the function's secrets are TEMPORARY: written through a temp env-file (deleted immediately), and UNSET in a
 *    finally block whatever happens. Secret values are never printed or logged;
 *  - the only AI provider key given to the function is the Gemini key; Redis/CodeCraft/Cloudflare are NOT provisioned.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";

const argv = process.argv.slice(2);
const arg = (n, d) => (argv.includes(n) ? argv[argv.indexOf(n) + 1] : d);
const envFile = arg("--env", ".env.production.local");
const maxCandidates = Number(arg("--max-candidates", "10")); // pre-LLM rejections cost no AI; the loop stops at the first that reaches the model
const REF = fs.readFileSync("supabase/.temp/project-ref", "utf8").trim();
const URL_FN = `https://${REF}.supabase.co/functions/v1/editorial-worker`;
const TEST_LEASE = "editorial-generate-edge-test";
const npx = process.platform === "win32" ? "npx.cmd" : "npx";
const sb = (args, opts = {}) => execFileSync(npx, ["--no-install", "supabase", ...args], { encoding: "utf8", shell: process.platform === "win32", ...opts });

function parseEnv(file) {
  const out = {};
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, "").trim();
  }
  return out;
}
const fileEnv = parseEnv(envFile);
const usable = (v) => Boolean(v) && v !== "[SENSITIVE]" && v.length >= 8;
if (!usable(fileEnv.GEMINI_API_KEY)) throw new Error("GEMINI_API_KEY not usable in env file");

const WORKER_SECRET = crypto.randomBytes(24).toString("hex");
const TEMP_SECRETS = {
  EDGE_WORKER_SECRET: WORKER_SECRET,
  EDGE_WORKER_TEST_MODE: "true",
  NEWSROOM_GENERATE_ARTICLES: "true",
  GEMINI_API_KEY: fileEnv.GEMINI_API_KEY,
  EDITORIAL_MAX_CANDIDATE_ATTEMPTS: "3",
  EDGE_WORKER_MAX_LLM_CALLS: "2",
  ...(usable(fileEnv.GEMINI_EDITORIAL_MODEL) ? { GEMINI_EDITORIAL_MODEL: fileEnv.GEMINI_EDITORIAL_MODEL } : {}),
  ...(usable(fileEnv.GEMINI_LIGHTWEIGHT_MODEL) ? { GEMINI_LIGHTWEIGHT_MODEL: fileEnv.GEMINI_LIGHTWEIGHT_MODEL } : {}),
};
const SECRET_NAMES = Object.keys(TEMP_SECRETS);

// Supabase keys for READ-ONLY checks + the lease-holder RPC (from the CLI session, memory only).
const keys = JSON.parse(sb(["projects", "api-keys", "--project-ref", REF, "-o", "json"]).replace(/^[^\[{]*/, ""));
const SERVICE = keys.find((k) => k.name === "service_role")?.api_key;
const ANON = keys.find((k) => k.name === "anon")?.api_key;
const SB = `https://${REF}.supabase.co`;
const rest = async (q, init = {}) => {
  const res = await fetch(`${SB}/rest/v1/${q}`, { ...init, headers: { apikey: SERVICE, authorization: `Bearer ${SERVICE}`, "content-type": "application/json", prefer: "count=exact", ...(init.headers ?? {}) } });
  const text = await res.text();
  return { status: res.status, count: res.headers.get("content-range"), json: text ? JSON.parse(text) : null };
};
const countOf = (r) => Number(/\/(\d+)$/.exec(r.count ?? "")?.[1] ?? NaN);
const rpc = async (n, a) => {
  const res = await fetch(`${SB}/rest/v1/rpc/${n}`, { method: "POST", headers: { apikey: SERVICE, authorization: `Bearer ${SERVICE}`, "content-type": "application/json" }, body: JSON.stringify(a) });
  return { status: res.status, json: await res.json().catch(() => null) };
};
const counts = async () => ({
  generated_articles: countOf(await rest("generated_articles?select=id&limit=1")),
  ops_cron_runs_editorial: countOf(await rest("ops_cron_runs?select=id&job=eq.editorial-generate&limit=1")),
  editorial_candidate_attempts: countOf(await rest("editorial_candidate_attempts?select=event_id&limit=1")),
  scheduler_dispatch_log: countOf(await rest("scheduler_dispatch_log?select=id&limit=1")),
  ai_provider_usage_events: countOf(await rest("ai_provider_usage_events?select=id&limit=1")),
});

async function call(body, headers = {}, { auth = true, method = "POST" } = {}) {
  const t0 = Date.now();
  const res = await fetch(URL_FN, { method, headers: { "content-type": "application/json", ...(auth ? { authorization: `Bearer ${WORKER_SECRET}` } : {}), ...headers }, body: method === "GET" ? undefined : JSON.stringify(body) });
  let json = null;
  try { json = await res.json(); } catch { /* non-json */ }
  return { http: res.status, ms: Date.now() - t0, body: json, sbRequestId: res.headers.get("sb-request-id") ?? res.headers.get("x-sb-request-id"), region: res.headers.get("x-sb-edge-region"), deployment: res.headers.get("sb-deployment-id") ?? res.headers.get("x-deno-execution-id") };
}

const report = { function_url: URL_FN, started_at: new Date().toISOString(), calls: {}, checks: [] };
const check = (name, ok, detail = "") => report.checks.push({ name, ok, detail });

function setSecrets() {
  const f = path.join(os.tmpdir(), `.edge-tmp-${crypto.randomBytes(6).toString("hex")}.env`);
  try {
    fs.writeFileSync(f, Object.entries(TEMP_SECRETS).map(([k, v]) => `${k}=${v}`).join("\n") + "\n", { mode: 0o600 });
    sb(["secrets", "set", "--env-file", f, "--project-ref", REF], { stdio: ["ignore", "pipe", "pipe"] });
  } finally {
    try { fs.rmSync(f, { force: true }); } catch { /* ignore */ }
  }
}
function unsetSecrets() {
  try { sb(["secrets", "unset", ...SECRET_NAMES, "--project-ref", REF], { stdio: ["ignore", "pipe", "pipe"] }); return true; } catch (e) { return String(e?.message ?? e).slice(0, 200); }
}
function secretNamesNow() {
  const out = sb(["secrets", "list", "--project-ref", REF, "-o", "json"]);
  const j = JSON.parse(out.replace(/^[^\[{]*/, ""));
  return (Array.isArray(j) ? j : j.secrets ?? []).map((s) => s.name);
}

let unsetResult = null;
try {
  report.secrets_before = secretNamesNow();
  report.counts_before = await counts();

  // ---- 1. hosted boot + fail-closed before any secret exists (already proven once; re-checked here) ----
  // (secrets are set below; boot with no secret was verified separately as 503 worker_secret_not_configured)

  setSecrets();
  // wait for the new secrets to reach a fresh isolate
  let ready = false;
  for (let i = 0; i < 30 && !ready; i++) {
    const r = await call({}, {}, { auth: true });
    ready = r.http !== 503;
    if (!ready) await new Promise((r2) => setTimeout(r2, 2000));
  }
  check("secrets propagated; authenticated call no longer 503", ready);

  // ---- 2. authentication ----
  const noAuth = await call({}, {}, { auth: false });
  check("no bearer -> 401", noAuth.http === 401 && noAuth.body?.status === "unauthorized", `${noAuth.http}`);
  const wrong = await call({}, { authorization: "Bearer definitely-wrong" }, { auth: false });
  check("wrong bearer -> 401", wrong.http === 401, `${wrong.http}`);
  const get = await call({}, {}, { method: "GET" });
  check("GET -> 405", get.http === 405, `${get.http}`);

  // ---- 3. inert scheduler: a scheduler-triggered run must do nothing while scheduler_control.enabled = false ----
  const sched = await call({}, { "x-jd-trigger": "scheduler" });
  check("scheduler-triggered run -> kill_switch_off (reads scheduler_control from Edge; scheduler stays inert)", sched.body?.status === "kill_switch_off" && sched.body?.llm?.totals?.calls === 0, JSON.stringify({ s: sched.body?.status, calls: sched.body?.llm?.totals?.calls }));
  report.calls.scheduler_trigger = { http: sched.http, status: sched.body?.status };

  // ---- 4. run mode refuses without durable quota (no Redis provisioned) ----
  const runMode = await call({});
  check("run mode without Redis -> durable_quota_unavailable, zero provider calls", runMode.body?.status === "durable_quota_unavailable" && runMode.body?.llm?.totals?.calls === 0, JSON.stringify({ s: runMode.body?.status }));

  // ---- 5. test-mode gating ----
  const noEvent = await call({ mode: "test" });
  check("test mode requires a specific event_id -> 400", noEvent.http === 400, `${noEvent.http} ${noEvent.body?.error_reason}`);
  const evInRun = await call({ event_id: "0d8a5c0e-1b1f-4e0a-9c55-000000000000" });
  check("event_id refused outside test mode -> 400", evInRun.http === 400, `${evInRun.http}`);

  // ---- 6. lease refusal / acquisition ----
  // freshest first: stale events are (correctly) rejected by the freshness gate before any AI call
  const evs = await rest(`news_events?select=id,canonical_title,urgency_score&updated_at=gte.${new Date(Date.now() - 12 * 3_600_000).toISOString()}&order=updated_at.desc&limit=80`);
  const listing = /epaper|e-paper|ई-?पेपर/i;
  let candidates = (evs.json ?? []).filter((e) => !listing.test(e.canonical_title ?? ""));
  if (candidates.length) {
    const used = await rest(`generated_articles?select=event_id&event_id=in.(${candidates.map((c) => c.id).join(",")})`);
    const usedIds = new Set((used.json ?? []).map((r) => r.event_id));
    candidates = candidates.filter((c) => !usedIds.has(c.id));
  }
  candidates = candidates.slice(0, Math.max(1, maxCandidates));
  report.candidates = candidates.map((c) => ({ id: c.id, title: (c.canonical_title ?? "").slice(0, 80), urgency: c.urgency_score }));
  if (!candidates.length) throw new Error("no non-listing candidate events found");

  const held = await rpc("acquire_run_lease", { p_key: TEST_LEASE, p_owner: "edge-validate", p_ttl_seconds: 120 });
  check("harness holds the test lease", held.json === true, JSON.stringify(held.json));
  const refused = await call({ mode: "test", event_id: candidates[0].id, lease_key: TEST_LEASE });
  check("lease held elsewhere -> worker refuses (overlap_lock) with zero provider calls", refused.body?.status === "overlap_lock" && refused.body?.llm?.totals?.calls === 0, JSON.stringify({ s: refused.body?.status, calls: refused.body?.llm?.totals?.calls }));
  await rpc("release_run_lease", { p_key: TEST_LEASE, p_owner: "edge-validate" });

  // ---- 7. one-event dry run(s) on the REAL Edge runtime ----
  const runs = [];
  for (const ev of candidates) {
    const r = await call({ mode: "test", event_id: ev.id, lease_key: TEST_LEASE, include_logs: true }, { "x-correlation-id": `edge-validate-${ev.id.slice(0, 8)}` });
    runs.push({ ev, r });
    if ((r.body?.llm?.totals?.calls ?? 0) > 0) break;
  }
  const withAi = runs.filter((x) => (x.r.body?.llm?.totals?.calls ?? 0) > 0);
  report.calls.attempts = runs.map((x) => ({ event_id: x.ev.id, http: x.r.http, ms: x.r.ms, status: x.r.body?.status, calls: x.r.body?.llm?.totals?.calls, error_class: x.r.body?.error_class }));
  const final = withAi[0]?.r ?? runs[runs.length - 1].r;
  const b = final.body ?? {};
  report.one_story = {
    http: final.http, request_wall_ms_client: final.ms, sb_request_id: final.sbRequestId, edge_region: final.region,
    status: b.status, event_id: b.event_id, article_id: b.article_id, published: b.published, headline_preview: b.headline_preview ?? null,
    provider: b.provider, model: b.model, error_class: b.error_class, error_reason: b.error_reason,
    llm_budget: b.llm ? { used: b.llm.used, max: b.llm.max } : null,
    provider_calls: (b.llm?.calls ?? []).map((c) => ({ provider: c.provider, model: c.model, operation: c.operation, endpoint: c.endpoint, ok: c.success, latency_ms: c.latencyMs, in_tokens: c.inputTokens, out_tokens: c.outputTokens, error: c.errorCode })),
    totals: b.llm?.totals, resources_reported_by_worker: b.resources, runtime_probe: b.runtime_probe, lease: b.lease, candidate_pool: b.candidate_pool,
  };
  check("AI request made on Edge and answered", (b.llm?.totals?.succeeded ?? 0) >= 1, JSON.stringify(b.llm?.totals));
  check("publication gates executed (dry_run_ok | dry_run_gated)", ["dry_run_ok", "dry_run_gated"].includes(b.status), String(b.status));
  const budgeted = (b.llm?.calls ?? []).filter((c) => c.operation?.startsWith("editorial") || c.operation === "schema_repair").length;
  check("provider calls bounded by the per-run budget", budgeted <= (b.llm?.max ?? 0) && budgeted > 0, `${budgeted}/${b.llm?.max}`);
  check("exactly one candidate reached the model", withAi.length === 1, `${withAi.length}`);
  check("dry run published/wrote nothing", b.published === false && b.article_id === null);

  // second (warm) sample of the same event for timing variance
  const warm = await call({ mode: "test", event_id: final.body?.event_id ?? candidates[0].id, lease_key: TEST_LEASE, include_logs: true });
  report.warm_sample = { request_wall_ms_client: warm.ms, status: warm.body?.status, worker_resources: warm.body?.resources, totals: warm.body?.llm?.totals, calls: (warm.body?.llm?.calls ?? []).map((c) => [c.provider, c.model, c.success, c.latencyMs]) };

  // ---- 8. lease released, nothing written, 089 objects visible from Edge ----
  const lease = await rest(`worker_run_leases?select=lease_key,expires_at&lease_key=eq.${TEST_LEASE}`);
  check("test lease released after the run", !(lease.json ?? [])[0] || new Date(lease.json[0].expires_at).getTime() <= Date.now(), JSON.stringify(lease.json));
  report.counts_after = await counts();
  const a = report.counts_before, z = report.counts_after;
  check("no article / run record / candidate-attempt row written", z.generated_articles === a.generated_articles && z.ops_cron_runs_editorial === a.ops_cron_runs_editorial && z.editorial_candidate_attempts === a.editorial_candidate_attempts, JSON.stringify({ a, z }));
  check("no scheduler dispatch happened", z.scheduler_dispatch_log === a.scheduler_dispatch_log, `${a.scheduler_dispatch_log} -> ${z.scheduler_dispatch_log}`);

  // ---- 9. secret scan over everything the function wrote to console + every response body ----
  const allLogs = [...(b.debug_logs ?? []), ...(warm.body?.debug_logs ?? [])];
  const needles = [WORKER_SECRET, TEMP_SECRETS.GEMINI_API_KEY, SERVICE, ANON].filter(Boolean);
  const blob = JSON.stringify([allLogs, noAuth.body, wrong.body, sched.body, runMode.body, refused.body, final.body, warm.body]);
  const leaked = needles.filter((n) => blob.includes(n));
  const shapes = /Bearer\s+[A-Za-z0-9._~+/=-]{12,}|eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}|AIza[A-Za-z0-9_-]{20,}/.exec(blob);
  check("no secrets in the function's console output or responses", leaked.length === 0 && !shapes, `logs=${allLogs.length} lines scanned; leaked=${leaked.length}; credential-shaped=${Boolean(shapes)}`);
  report.console_lines_sample = allLogs.slice(0, 6).map((l) => l.slice(0, 200));
} catch (e) {
  check("validation run completed without exception", false, String(e?.stack ?? e).slice(0, 400));
} finally {
  unsetResult = unsetSecrets();
  try {
    report.secrets_after = secretNamesNow();
    const left = SECRET_NAMES.filter((n) => report.secrets_after.includes(n));
    check("temporary secrets removed from the function", unsetResult === true && left.length === 0, unsetResult === true ? `remaining=${left.join(",") || "none"}` : String(unsetResult));
  } catch (e) {
    check("temporary secrets removed from the function", false, String(e).slice(0, 200));
  }
}

console.log(JSON.stringify(report, null, 2));
const failed = report.checks.filter((c) => !c.ok);
console.log(`\n${report.checks.length - failed.length}/${report.checks.length} checks passed`);
for (const f of failed) console.log(`FAIL ${f.name} :: ${f.detail}`);
process.exitCode = failed.length ? 1 : 0;
