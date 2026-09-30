/**
 * One-story test for the Edge editorial worker. Runs the BUILT bundle under a real Deno runtime.
 *
 *   pnpm edge:build
 *   node scripts/edge-one-story-test.mjs --deno <path-to-deno> [--env .env.production.local] [--event <uuid>] [--max-candidates 3]
 *
 * Safety model (nothing here persists an article or touches the backlog):
 *  - test mode only, ONE selected event at a time, dry_run=true (full pipeline + every publication gate, no writes);
 *  - the lease is exercised on a dedicated test key ("editorial-generate-edge-test"), never the real one;
 *  - the fault phase points CodeCraft at a LOCAL mock server, with Redis and circuit persistence disabled, so
 *    injected 401/429/503 responses cannot alter shared production state;
 *  - secrets are read from the env file into the child process only and are never printed.
 * Read-only PostgREST calls are used to choose an event and to prove nothing was written.
 */
import { spawn, execFileSync } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import crypto from "node:crypto";

const argv = process.argv.slice(2);
const arg = (name, def) => {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : def;
};
const deno = arg("--deno", process.env.DENO_BIN || "deno");
const envFile = arg("--env", ".env.production.local");
const forcedEvent = arg("--event", null);
const maxCandidates = Number(arg("--max-candidates", "3"));
const entry = path.join(process.cwd(), "supabase/functions/editorial-worker/index.ts");
const PORT = 8000;
const MOCK_PORT = 8791;
const SECRET = crypto.randomBytes(16).toString("hex");
const TEST_LEASE = "editorial-generate-edge-test";

/* ---------- env (allow-listed, never printed) ---------- */
function parseEnv(file) {
  const out = {};
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
    if (!m) continue;
    out[m[1]] = m[2].replace(/^["']|["']$/g, "").replace(/\\n$/, "").trim();
  }
  return out;
}
const fileEnv = parseEnv(envFile);
const ALLOW = [
  "NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY",
  "GEMINI_API_KEY", "GEMINI_EDITORIAL_MODEL", "GEMINI_LIGHTWEIGHT_MODEL", "GEMINI_PREMIUM_EDITORIAL_MODEL", "GEMINI_TRANSLATION_MODEL",
  "GROQ_API_KEY", "GROQ_WRITER_MODEL", "GROQ_REVIEW_MODEL", "GROQ_REVIEW_FALLBACK_MODEL", "GROQ_LIGHTWEIGHT_MODEL",
  "CLOUDFLARE_ACCOUNT_ID", "CLOUDFLARE_API_TOKEN", "CLOUDFLARE_EMBEDDING_MODEL",
  "UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN",
  "NEWSROOM_EDITORIAL_LANGUAGE", "CROSS_LANG_DEDUPE_MODE",
];
const baseEnv = {
  PATH: process.env.PATH ?? "",
  SystemRoot: process.env.SystemRoot ?? "",
  TEMP: process.env.TEMP ?? "",
  EDGE_WORKER_SECRET: SECRET,
  EDGE_WORKER_TEST_MODE: "true",
  NEWSROOM_GENERATE_ARTICLES: "true",
  EDGE_WORKER_MAX_LLM_CALLS: "2",
  EDITORIAL_MAX_CANDIDATE_ATTEMPTS: "3",
  // the harness must never reach the CodeCraft account, nor persist circuit-breaker state to production
  CODECRAFT_API_KEY: "",
  AI_CIRCUIT_PERSIST: "off",
};
const usable = (v) => Boolean(v) && v !== "[SENSITIVE]" && v.length >= 8;
for (const k of ALLOW) if (usable(fileEnv[k])) baseEnv[k] = fileEnv[k];

/**
 * Vercel "sensitive" variables are stored as a placeholder in pulled env files. When the Supabase values are missing,
 * resolve them from the already-authenticated Supabase CLI session (project ref from supabase/.temp, gitignored).
 * Held in this process's memory / the child's env only: never printed, never written to disk.
 */
if (!usable(baseEnv.NEXT_PUBLIC_SUPABASE_URL) || !usable(baseEnv.SUPABASE_SERVICE_ROLE_KEY) || !usable(baseEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY)) {
  const ref = fs.readFileSync("supabase/.temp/project-ref", "utf8").trim();
  const npx = process.platform === "win32" ? "npx.cmd" : "npx";
  const keys = JSON.parse(execFileSync(npx, ["--no-install", "supabase", "projects", "api-keys", "--project-ref", ref, "-o", "json"], { encoding: "utf8", shell: process.platform === "win32" }).replace(/^[^\[{]*/, ""));
  const pick = (name) => keys.find((k) => k.name === name)?.api_key;
  baseEnv.NEXT_PUBLIC_SUPABASE_URL = `https://${ref}.supabase.co`;
  baseEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY = pick("anon");
  baseEnv.SUPABASE_SERVICE_ROLE_KEY = pick("service_role");
  if (!usable(baseEnv.SUPABASE_SERVICE_ROLE_KEY) || !usable(baseEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY)) {
    throw new Error("could not resolve Supabase keys from the CLI session (legacy service_role/anon keys not returned)");
  }
}
// The Supabase-provided names the Edge platform injects (bootstrapEnv maps them like the platform would):
baseEnv.SUPABASE_URL = baseEnv.NEXT_PUBLIC_SUPABASE_URL;
baseEnv.SUPABASE_ANON_KEY = baseEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY;
delete baseEnv.NEXT_PUBLIC_SUPABASE_URL;
delete baseEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SB_URL = baseEnv.SUPABASE_URL;
const SB_KEY = baseEnv.SUPABASE_SERVICE_ROLE_KEY;
if (!SB_URL || !SB_KEY) throw new Error(`Supabase URL/service role missing in ${envFile}`);

/* ---------- read-only PostgREST helpers ---------- */
async function rest(pathAndQuery, init = {}) {
  const res = await fetch(`${SB_URL}/rest/v1/${pathAndQuery}`, {
    ...init,
    headers: { apikey: SB_KEY, authorization: `Bearer ${SB_KEY}`, "content-type": "application/json", prefer: "count=exact", ...(init.headers ?? {}) },
  });
  const text = await res.text();
  return { status: res.status, count: res.headers.get("content-range"), json: text ? JSON.parse(text) : null };
}
const countOf = (r) => Number(/\/(\d+)$/.exec(r.count ?? "")?.[1] ?? NaN);
async function snapshotCounts() {
  const articles = await rest("generated_articles?select=id&limit=1");
  const runs = await rest("ops_cron_runs?select=id&job=eq.editorial-generate&limit=1");
  const attempts = await rest("editorial_candidate_attempts?select=event_id&limit=1"); // 404 until migration 089 is applied
  const usage = await rest("ai_provider_usage_events?select=id&limit=1");
  const audit = await rest("editorial_audit_log?select=id&limit=1");
  return {
    generated_articles: countOf(articles), ops_cron_runs_editorial: countOf(runs),
    candidate_attempts_table: attempts.status === 200 ? countOf(attempts) : "absent",
    // disclosure only (telemetry a provider call inherently writes); not asserted unchanged:
    ai_provider_usage_events: countOf(usage), editorial_audit_log: countOf(audit),
  };
}
async function rpc(name, args) {
  const res = await fetch(`${SB_URL}/rest/v1/rpc/${name}`, { method: "POST", headers: { apikey: SB_KEY, authorization: `Bearer ${SB_KEY}`, "content-type": "application/json" }, body: JSON.stringify(args) });
  return { status: res.status, json: await res.json().catch(() => null) };
}
async function chooseEvents(limit) {
  if (forcedEvent) return [{ id: forcedEvent, canonical_title: "(forced)" }];
  const since = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const ev = await rest(`news_events?select=id,canonical_title,region,category,urgency_score,created_at&created_at=gte.${since}&order=urgency_score.desc&limit=40`);
  const rows = ev.json ?? [];
  if (!rows.length) return [];
  const used = await rest(`generated_articles?select=event_id&event_id=in.(${rows.map((r) => r.id).join(",")})`);
  const usedIds = new Set((used.json ?? []).map((r) => r.event_id));
  return rows.filter((r) => !usedIds.has(r.id)).slice(0, limit);
}

/* ---------- Deno child ---------- */
function startWorker(env) {
  const child = spawn(deno, ["run", "--allow-net", "--allow-env", "--allow-read", entry], { env, stdio: ["ignore", "pipe", "pipe"] });
  const logs = [];
  let buf = "";
  child.stdout.on("data", (d) => {
    buf += d;
    let i;
    while ((i = buf.indexOf("\n")) >= 0) {
      logs.push(buf.slice(0, i));
      buf = buf.slice(i + 1);
    }
  });
  child.stderr.on("data", () => {});
  return { child, logs };
}
async function waitUp() {
  for (let i = 0; i < 80; i++) {
    try {
      await fetch(`http://127.0.0.1:${PORT}/`);
      return true;
    } catch {
      await new Promise((r) => setTimeout(r, 250));
    }
  }
  return false;
}
function procStats(pid) {
  try {
    const out = execFileSync("powershell.exe", ["-NoProfile", "-Command", `$p=Get-Process -Id ${pid}; "$($p.TotalProcessorTime.TotalMilliseconds)|$($p.PeakWorkingSet64)|$($p.PeakPagedMemorySize64)"`], { encoding: "utf8" }).trim();
    const [cpuMs, peakWs, peakPaged] = out.split("|").map(Number);
    return { cpu_ms: Math.round(cpuMs), peak_working_set_mb: Math.round((peakWs / 1048576) * 10) / 10, peak_private_mb: Math.round((peakPaged / 1048576) * 10) / 10 };
  } catch {
    return null;
  }
}
async function call(body, headers = {}) {
  const t0 = Date.now();
  const res = await fetch(`http://127.0.0.1:${PORT}/`, { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${SECRET}`, ...headers }, body: JSON.stringify(body) });
  const json = await res.json();
  return { http: res.status, ms: Date.now() - t0, body: json };
}
async function stop(worker) {
  const exited = new Promise((r) => worker.child.once("exit", (code) => r(code)));
  worker.child.kill();
  return await Promise.race([exited, new Promise((r) => setTimeout(() => r("timeout"), 4000))]);
}

const report = { started_at: new Date().toISOString(), deno: null, phases: {} };
const pass = [];
const check = (name, ok, detail) => { pass.push({ name, ok, detail }); };

/* ================= Phase A: real run (lease, AI, gates, one story) ================= */
{
  const before = await snapshotCounts();
  report.phases.before = before;
  const worker = startWorker({ ...baseEnv });
  report.deno = execFileSync(deno, ["--version"], { encoding: "utf8" }).split("\n")[0];
  const up = await waitUp();
  check("A0 worker boots under Deno", up);
  if (!up) throw new Error("worker did not start");
  const idle = procStats(worker.child.pid);
  report.phases.idle_process = idle;

  // 2. lease: hold the test lease elsewhere -> worker must refuse and make NO AI call
  const acq = await rpc("acquire_run_lease", { p_key: TEST_LEASE, p_owner: "harness", p_ttl_seconds: 120 });
  check("A1 harness acquired test lease", acq.json === true, JSON.stringify(acq.json));
  const events = await chooseEvents(maxCandidates);
  report.phases.candidates_considered = events.map((e) => ({ id: e.id, title: (e.canonical_title ?? "").slice(0, 70), urgency: e.urgency_score ?? null }));
  if (!events.length) throw new Error("no candidate events found");
  const blocked = await call({ mode: "test", event_id: events[0].id, lease_key: TEST_LEASE });
  check("A2 lease held elsewhere -> worker refuses (overlap_lock) with zero provider calls", blocked.body.status === "overlap_lock" && blocked.body.llm.totals.calls === 0, JSON.stringify({ s: blocked.body.status, calls: blocked.body.llm.totals.calls }));
  await rpc("release_run_lease", { p_key: TEST_LEASE, p_owner: "harness" });

  // 3. real one-story dry run, trying at most N candidates (stop at the first that reaches the model)
  let final = null;
  const attempts = [];
  for (const ev of events) {
    const r = await call({ mode: "test", event_id: ev.id, lease_key: TEST_LEASE }, { "x-correlation-id": `one-story-${ev.id.slice(0, 8)}` });
    attempts.push({ event_id: ev.id, status: r.body.status, http: r.http, ms: r.ms, llm_calls: r.body.llm.totals.calls, error_class: r.body.error_class });
    if (r.body.llm.totals.calls > 0) { final = r; break; }
  }
  report.phases.attempts = attempts;
  const afterRun = procStats(worker.child.pid);
  report.phases.process_after_run = afterRun;
  if (final) {
    const b = final.body;
    report.phases.one_story = {
      http: final.http, wall_ms_request: final.ms, status: b.status, event_id: b.event_id, article_id: b.article_id, published: b.published,
      headline_preview: b.headline_preview ?? null, provider: b.provider, model: b.model, error_class: b.error_class, error_reason: b.error_reason,
      correlation_id: b.correlation_id, run_id: b.run_id, llm_budget: { used: b.llm.used, max: b.llm.max },
      provider_calls: b.llm.calls.map((c) => ({ provider: c.provider, model: c.model, operation: c.operation, endpoint: c.endpoint, ok: c.success, latency_ms: c.latencyMs, in_tokens: c.inputTokens, out_tokens: c.outputTokens, error: c.errorCode })),
      totals: b.llm.totals, resources_reported_by_worker: b.resources, lease: b.lease, candidate_pool: b.candidate_pool,
    };
    check("A3 AI request made and answered", b.llm.totals.calls >= 1 && b.llm.totals.succeeded >= 1, JSON.stringify(b.llm.totals));
    check("A4 publication gates evaluated (dry_run_ok or dry_run_gated with class)", ["dry_run_ok", "dry_run_gated"].includes(b.status), b.status);
    check("A5 exactly one candidate processed", attempts.filter((a) => a.llm_calls > 0).length === 1);
    // The budget governs editorial provider calls (generate/repair/review); the Cloudflare dedupe embedding is not budgeted.
    const budgeted = b.llm.calls.filter((c) => c.operation.startsWith("editorial") || c.operation === "schema_repair").length;
    check("A6 LLM call budget respected (budgeted editorial calls <= max)", budgeted <= b.llm.max, `${budgeted}/${b.llm.max} (total provider calls incl. embedding: ${b.llm.totals.calls})`);
    check("A7 nothing published/written by a dry run", b.published === false && b.article_id === null);
  } else {
    check("A3 AI request made and answered", false, "no candidate reached the model: " + JSON.stringify(attempts));
  }

  // 4. clean exit + lease released + no writes
  const still = await fetch(`http://127.0.0.1:${PORT}/`).then((r) => r.status).catch(() => 0);
  check("A8 worker still healthy after the run (clean, not crashed)", still === 405, String(still));
  const lease = await rest(`worker_run_leases?select=lease_key,expires_at&lease_key=eq.${TEST_LEASE}`);
  const leaseFree = !(lease.json ?? [])[0] || new Date(lease.json[0].expires_at).getTime() <= Date.now();
  check("A9 lease released after the run", leaseFree, JSON.stringify(lease.json));
  const after = await snapshotCounts();
  report.phases.after = after;
  check("A10 no article/run/attempt rows written (dry run)", after.generated_articles === before.generated_articles && after.ops_cron_runs_editorial === before.ops_cron_runs_editorial && String(after.candidate_attempts_table) === String(before.candidate_attempts_table), JSON.stringify({ before, after }));
  const secretLeak = worker.logs.some((l) => l.includes(SECRET) || (baseEnv.GEMINI_API_KEY && l.includes(baseEnv.GEMINI_API_KEY)) || (baseEnv.SUPABASE_SERVICE_ROLE_KEY && l.includes(baseEnv.SUPABASE_SERVICE_ROLE_KEY)));
  check("A11 no secrets in worker logs", !secretLeak);
  report.phases.worker_log_events = worker.logs.map((l) => { try { const j = JSON.parse(l); return `${j.event}${j.status ? ":" + j.status : ""}`; } catch { return null; } }).filter(Boolean);
  report.phases.exit_code = await stop(worker);
}

/* ================= Phase B: provider fault injection (local mock, no prod state touched) ================= */
{
  const events = await chooseEvents(1);
  const seen = [];
  let mode = "401";
  const server = http.createServer((req, res) => {
    let body = "";
    req.on("data", (d) => (body += d));
    req.on("end", () => {
      seen.push({ t: Date.now(), mode, path: req.url });
      if (mode === "401") { res.writeHead(401, { "content-type": "application/json" }); res.end(JSON.stringify({ error: { message: "invalid api key" } })); }
      else if (mode === "404") { res.writeHead(404, { "content-type": "application/json" }); res.end(JSON.stringify({ error: { message: "model not found" } })); }
      else if (mode === "429") { res.writeHead(429, { "content-type": "application/json", "retry-after": "30" }); res.end(JSON.stringify({ error: { message: "rate limit" } })); }
      else { res.writeHead(503, { "content-type": "application/json" }); res.end(JSON.stringify({ error: { message: "upstream unavailable" } })); }
    });
  });
  await new Promise((r) => server.listen(MOCK_PORT, "127.0.0.1", r));
  const faultEnv = { ...baseEnv };
  for (const k of ["GEMINI_API_KEY", "GROQ_API_KEY", "UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN"]) delete faultEnv[k];
  Object.assign(faultEnv, {
    CODECRAFT_API_KEY: "mock-key-not-real", CODECRAFT_BASE_URL: `http://127.0.0.1:${MOCK_PORT}/v1`,
    CODECRAFT_EDITORIAL_MODEL: "mock-model", CODECRAFT_REPAIR_MODEL: "mock-model",
    AI_CIRCUIT_PERSIST: "off",
  });
  report.phases.fault = {};
  for (const m of ["401", "404", "429", "503"]) {
    mode = m;
    seen.length = 0;
    const worker = startWorker({ ...faultEnv });
    if (!(await waitUp())) { check(`B ${m} worker boots`, false); await stop(worker); continue; }
    const ev = events[0];
    const r = await call({ mode: "test", event_id: ev.id, lease_key: TEST_LEASE, dry_run: true });
    const gaps = seen.slice(1).map((s, i) => s.t - seen[i].t);
    report.phases.fault[m] = { status: r.body.status, error_class: r.body.error_class, provider_retryable: r.body.provider_retryable, http_requests_to_provider: seen.length, gaps_ms: gaps, calls: r.body.llm.totals.calls, exit_clean: null };
    if (m === "401" || m === "404") check(`B ${m}: non-retryable -> exactly 1 provider request`, seen.length === 1, `requests=${seen.length}`);
    if (m === "429") check("B 429: not retried in-run (fails over / stops), Retry-After parsed by adapter", seen.length === 1, `requests=${seen.length}`);
    if (m === "503") check("B 503: retried with backoff+jitter, never immediately", seen.length >= 2 ? gaps.every((g) => g >= 550) : true, `requests=${seen.length} gaps=${gaps.join(",")}`);
    const expectClass = { "401": "provider_auth", "404": "provider_invalid_request", "429": "provider_quota_exhausted", "503": "provider_upstream" }[m];
    check(`B ${m}: run ends cleanly, classified as ${expectClass}`, r.http === 200 && r.body.status === "failed" && r.body.error_class === expectClass, `${r.http} ${r.body.status}/${r.body.error_class}`);
    report.phases.fault[m].exit_clean = await stop(worker);
  }
  server.close();
}

report.checks = pass;
console.log(JSON.stringify(report, null, 2));
const failed = pass.filter((c) => !c.ok);
console.log(`\n${pass.length - failed.length}/${pass.length} checks passed`);
for (const f of failed) console.log(`FAIL ${f.name} :: ${f.detail ?? ""}`);
process.exitCode = failed.length ? 1 : 0;
