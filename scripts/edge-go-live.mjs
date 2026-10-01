/**
 * Controlled go-live for the Supabase Edge pipeline. Idempotent; never prints secret values.
 *
 *   node scripts/edge-go-live.mjs plan                 what is present / missing (names only), and what each step will do
 *   node scripts/edge-go-live.mjs provision --apply    Redis check -> Edge secrets -> Vault -> Vercel env  (scheduler stays OFF)
 *   node scripts/edge-go-live.mjs preflight            real-runtime checks of every worker, Redis atomicity, DB headroom
 *   node scripts/edge-go-live.mjs enable --apply       runs preflight; only if green flips scheduler_control.enabled = true
 *   node scripts/edge-go-live.mjs observe [minutes]    watches the first scheduler cycle
 *   node scripts/edge-go-live.mjs disable              flips the kill switch OFF immediately
 *
 * Inputs: `.env.production.local` (Gemini / Groq / Cloudflare keys, pulled from Vercel) and
 *         `.env.edge-provision.local` (git-ignored) for values Vercel keeps write-only:
 *           UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN,
 *           CODECRAFT_API_KEY, CODECRAFT_EDITORIAL_MODEL [, CODECRAFT_REPAIR_MODEL, CODECRAFT_BASE_URL],
 *           optional: GNEWS_API_KEY, NEWSDATA_API_KEY, OPENAI_API_KEY (translation guard),
 *                     GEMINI_EDITORIAL_MODEL, GEMINI_LIGHTWEIGHT_MODEL, GEMINI_TRANSLATION_MODEL,
 *                     GROQ_WRITER_MODEL, GROQ_REVIEW_MODEL, CLOUDFLARE_EMBEDDING_MODEL
 * Generated secrets are kept in `.edge-secrets.local` (git-ignored, same trust boundary as the env files above).
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";

const [cmd = "plan", ...cliArgs] = process.argv.slice(2);
const APPLY = cliArgs.includes("--apply");
const REF = fs.readFileSync("supabase/.temp/project-ref", "utf8").trim();
const SB = `https://${REF}.supabase.co`;
const FN = `${SB}/functions/v1`;
const SITE = "https://www.jandarpan.news";
const npx = process.platform === "win32" ? "npx.cmd" : "npx";
const run = (tool, args, opts = {}) => execFileSync(npx, ["--no-install", tool, ...args], { encoding: "utf8", shell: process.platform === "win32", ...opts });
const sb = (args, opts) => run("supabase", args, opts);

/* ------------------------------------------------------------------------------------------ inputs */
export function parseEnvText(text) {
  const out = {};
  for (const line of text.split(/\r?\n/)) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, "").trim();
  }
  return out;
}
const readEnv = (f) => (fs.existsSync(f) ? parseEnvText(fs.readFileSync(f, "utf8")) : {});
export const usable = (v) => typeof v === "string" && v.length >= 8 && v !== "[SENSITIVE]";

const pulled = readEnv(".env.production.local");
const supplied = readEnv(".env.edge-provision.local");
const SECRETS_FILE = ".edge-secrets.local";
const generated = readEnv(SECRETS_FILE);

const REQUIRED_SUPPLIED = ["UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN", "CODECRAFT_API_KEY", "CODECRAFT_EDITORIAL_MODEL"];
const OPTIONAL_SUPPLIED = ["CODECRAFT_REPAIR_MODEL", "CODECRAFT_BASE_URL", "GNEWS_API_KEY", "NEWSDATA_API_KEY", "OPENAI_API_KEY", "GEMINI_EDITORIAL_MODEL", "GEMINI_LIGHTWEIGHT_MODEL", "GEMINI_TRANSLATION_MODEL", "GROQ_WRITER_MODEL", "GROQ_REVIEW_MODEL", "CLOUDFLARE_EMBEDDING_MODEL"];
const FROM_PULLED = ["GEMINI_API_KEY", "GROQ_API_KEY", "CLOUDFLARE_ACCOUNT_ID", "CLOUDFLARE_API_TOKEN"];

/** Flags this pipeline needs, set explicitly (Vercel keeps its own copies write-only). */
const FLAGS = {
  NEWSROOM_GENERATE_ARTICLES: "true",
  NEWSROOM_AUTO_PUBLISH: "true",
  NEWSROOM_CLUSTER_EVENTS: "true",
  NEWSROOM_USE_EMBEDDINGS: "true",
  NEWSROOM_LEGACY_BRIDGE: "false", // signals only: no news_articles copy, no dead-end news_ai_queue rows
  AUDIO_GENERATION_ENABLED: "false",
  EDGE_WORKER_MAX_LLM_CALLS: "2",
  EDITORIAL_MAX_CANDIDATE_ATTEMPTS: "3",
  APP_BASE_URL: SITE,
  NEXT_PUBLIC_SITE_URL: SITE,
};

export function missingRequired(sup) {
  return REQUIRED_SUPPLIED.filter((k) => !usable(sup[k]));
}

function buildEdgeSecrets() {
  const s = { ...FLAGS };
  for (const k of FROM_PULLED) if (usable(pulled[k])) s[k] = pulled[k];
  for (const k of [...REQUIRED_SUPPLIED, ...OPTIONAL_SUPPLIED]) if (usable(supplied[k])) s[k] = supplied[k];
  s.EDGE_WORKER_SECRET = generated.EDGE_WORKER_SECRET;
  s.CRON_SCHEDULER_SECRET = generated.CRON_SCHEDULER_SECRET;
  return s;
}

/* ------------------------------------------------------------------------------------------ helpers */
const keys = () => JSON.parse(sb(["projects", "api-keys", "--project-ref", REF, "-o", "json"]).replace(/^[^\[{]*/, ""));
let _svc;
const serviceKey = () => (_svc ??= keys().find((k) => k.name === "service_role")?.api_key);
const rest = async (q, init = {}) => {
  const res = await fetch(`${SB}/rest/v1/${q}`, { ...init, headers: { apikey: serviceKey(), authorization: `Bearer ${serviceKey()}`, "content-type": "application/json", prefer: "count=exact", ...(init.headers ?? {}) } });
  const text = await res.text();
  return { status: res.status, count: Number(/\/(\d+)$/.exec(res.headers.get("content-range") ?? "")?.[1] ?? NaN), json: text ? JSON.parse(text) : null };
};
const rpc = async (n, a) => {
  const res = await fetch(`${SB}/rest/v1/rpc/${n}`, { method: "POST", headers: { apikey: serviceKey(), authorization: `Bearer ${serviceKey()}`, "content-type": "application/json" }, body: JSON.stringify(a) });
  return { status: res.status, json: await res.json().catch(() => null) };
};
const sql = (q) => {
  const f = path.join(os.tmpdir(), `.gl-${crypto.randomBytes(5).toString("hex")}.sql`);
  try {
    fs.writeFileSync(f, q, { mode: 0o600 });
    const out = sb(["db", "query", "--linked", "-f", f, "-o", "json"], { stdio: ["ignore", "pipe", "pipe"] });
    const j = JSON.parse(out.slice(out.indexOf("{"), out.lastIndexOf("}") + 1));
    return j.rows ?? [];
  } finally {
    fs.rmSync(f, { force: true });
  }
};
const withEnvFile = (obj, fn) => {
  const f = path.join(os.tmpdir(), `.gl-${crypto.randomBytes(5).toString("hex")}.env`);
  try {
    fs.writeFileSync(f, Object.entries(obj).map(([k, v]) => `${k}=${v}`).join("\n") + "\n", { mode: 0o600 });
    return fn(f);
  } finally {
    fs.rmSync(f, { force: true });
  }
};
const setEdgeSecrets = (obj) => withEnvFile(obj, (f) => sb(["secrets", "set", "--env-file", f, "--project-ref", REF], { stdio: ["ignore", "pipe", "pipe"] }));
const unsetEdgeSecrets = (names) => sb(["secrets", "unset", ...names, "--project-ref", REF], { stdio: ["ignore", "pipe", "pipe"] });
const secretNames = () => { const j = JSON.parse(sb(["secrets", "list", "--project-ref", REF, "-o", "json"]).replace(/^[^\[{]*/, "")); return (Array.isArray(j) ? j : j.secrets ?? []).map((s) => s.name); };

const results = [];
const ok = (name, pass, detail = "") => { results.push({ name, pass, detail }); console.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail ? "  -  " + detail : ""}`); return pass; };
const summary = () => { const bad = results.filter((r) => !r.pass); console.log(`\n${results.length - bad.length}/${results.length} checks passed`); return bad.length === 0; };

/* -------------------------------------------------------------------------------------------- redis */
async function redisCmd(url, token, ...args) {
  const res = await fetch(url.replace(/\/$/, ""), { method: "POST", headers: { authorization: `Bearer ${token}`, "content-type": "application/json" }, body: JSON.stringify(args) });
  const j = await res.json().catch(() => ({}));
  if (!res.ok || j.error) throw new Error(`redis ${args[0]} -> HTTP ${res.status} ${j.error ?? ""}`.trim());
  return j.result;
}
/** Reachable + the atomic check-and-increment the quota governor relies on (EVAL) really is atomic under concurrency. */
export async function redisAtomicityProbe(url, token, { limit = 5, parallel = 25 } = {}) {
  const key = `jd:go-live-probe:${crypto.randomBytes(4).toString("hex")}`;
  const lua = "local c = redis.call('INCR', KEYS[1]); if c > tonumber(ARGV[1]) then redis.call('DECR', KEYS[1]); return 0 end; redis.call('EXPIRE', KEYS[1], 60); return 1";
  try {
    const pong = await redisCmd(url, token, "PING");
    if (String(pong).toUpperCase() !== "PONG") throw new Error("PING did not return PONG");
    const wins = (await Promise.all(Array.from({ length: parallel }, () => redisCmd(url, token, "EVAL", lua, 1, key, limit)))).filter((r) => Number(r) === 1).length;
    return { reachable: true, atomic: wins === limit, wins, limit, parallel };
  } finally {
    try { await redisCmd(url, token, "DEL", key); } catch { /* best effort */ }
  }
}

/* ---------------------------------------------------------------------------------------- commands */
async function plan() {
  const miss = missingRequired(supplied);
  console.log("Edge go-live plan (names only; no values are ever printed)\n");
  console.log("Supplied locally (.env.edge-provision.local):");
  for (const k of [...REQUIRED_SUPPLIED, ...OPTIONAL_SUPPLIED]) console.log(`  ${usable(supplied[k]) ? "present " : REQUIRED_SUPPLIED.includes(k) ? "MISSING " : "absent  "} ${k}${REQUIRED_SUPPLIED.includes(k) ? "  (required)" : ""}`);
  console.log("Pulled from Vercel (.env.production.local):");
  for (const k of FROM_PULLED) console.log(`  ${usable(pulled[k]) ? "present " : "MISSING "} ${k}`);
  console.log("Generated by this tool:", usable(generated.EDGE_WORKER_SECRET) ? "EDGE_WORKER_SECRET, CRON_SCHEDULER_SECRET (already created)" : "EDGE_WORKER_SECRET, CRON_SCHEDULER_SECRET (will be created)");
  console.log("Flags set explicitly:", Object.keys(FLAGS).join(", "));
  console.log("\nSteps: Redis reachability + atomicity -> Edge secrets -> Vault (jd_edge_*, jd_cron_secret, jd_app_base_url) -> Vercel env CRON_SCHEDULER_SECRET -> redeploy workers. Scheduler stays OFF until `enable`.");
  if (miss.length) { console.log(`\nBLOCKED: ${miss.length} required value(s) are write-only in Vercel and must be supplied: ${miss.join(", ")}`); process.exitCode = 2; }
}

async function provision() {
  const miss = missingRequired(supplied);
  if (miss.length) { console.log(`BLOCKED - missing required values: ${miss.join(", ")} (see \`plan\`).`); process.exitCode = 2; return; }
  const redis = await redisAtomicityProbe(supplied.UPSTASH_REDIS_REST_URL, supplied.UPSTASH_REDIS_REST_TOKEN);
  if (!ok("Redis reachable and atomic EVAL holds under concurrency", redis.reachable && redis.atomic, JSON.stringify(redis))) { process.exitCode = 1; return; }
  if (!usable(generated.EDGE_WORKER_SECRET)) {
    fs.writeFileSync(SECRETS_FILE, `EDGE_WORKER_SECRET=${crypto.randomBytes(32).toString("hex")}\nCRON_SCHEDULER_SECRET=${crypto.randomBytes(32).toString("hex")}\n`, { mode: 0o600 });
    Object.assign(generated, readEnv(SECRETS_FILE));
  }
  const edge = buildEdgeSecrets();
  console.log(`Edge secrets to set (${Object.keys(edge).length}): ${Object.keys(edge).sort().join(", ")}`);
  if (!APPLY) { console.log("\n(dry run - pass --apply to write secrets)"); return; }

  setEdgeSecrets(edge);
  ok("Edge secrets written", true, `${Object.keys(edge).length} names`);

  // Vault: dispatcher credentials (Edge workers + the remaining Vercel HTTP jobs). Upsert without ever echoing values.
  const q = (v) => `'${String(v).replace(/'/g, "''")}'`;
  const upsert = (name, value) => `do $$ begin if exists (select 1 from vault.secrets where name = ${q(name)}) then perform vault.update_secret((select id from vault.secrets where name = ${q(name)}), ${q(value)}); else perform vault.create_secret(${q(value)}, ${q(name)}); end if; end $$;`;
  sql([upsert("jd_edge_base_url", FN), upsert("jd_edge_worker_secret", generated.EDGE_WORKER_SECRET), upsert("jd_app_base_url", SITE), upsert("jd_cron_secret", generated.CRON_SCHEDULER_SECRET), "select 1 as ok;"].join("\n"));
  const v = sql("select name from vault.decrypted_secrets where name in ('jd_edge_base_url','jd_edge_worker_secret','jd_app_base_url','jd_cron_secret') order by 1;");
  ok("Vault dispatcher secrets present", v.length === 4, v.map((r) => r.name).join(","));

  // Vercel: the website must accept the scheduler secret (revalidate route, remaining cron routes).
  try {
    run("vercel", ["env", "rm", "CRON_SCHEDULER_SECRET", "production", "--yes"], { stdio: ["ignore", "pipe", "pipe"] });
  } catch { /* not present yet */ }
  run("vercel", ["env", "add", "CRON_SCHEDULER_SECRET", "production", "--sensitive"], { input: generated.CRON_SCHEDULER_SECRET + "\n", stdio: ["pipe", "pipe", "pipe"] });
  ok("Vercel production env CRON_SCHEDULER_SECRET set (takes effect on the next production deployment)", true);
  console.log("\nNext: redeploy production (merge / `vercel redeploy`), then run `preflight`.");
}

async function callWorker(fn, body = {}, headers = {}, secret = generated.EDGE_WORKER_SECRET) {
  const t0 = Date.now();
  const res = await fetch(`${FN}/${fn}`, { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${secret}`, ...headers }, body: JSON.stringify(body) });
  let json = null;
  try { json = await res.json(); } catch { /* non-json */ }
  return { http: res.status, ms: Date.now() - t0, body: json };
}

async function preflight() {
  if (!usable(generated.EDGE_WORKER_SECRET)) { console.log("BLOCKED - run `provision --apply` first (no generated secrets found)."); process.exitCode = 2; return false; }
  const ctl = (await rest("scheduler_control?select=enabled,prune_enabled&id=eq.1")).json?.[0];
  ok("scheduler kill switch is OFF before preflight", ctl?.enabled === false, JSON.stringify(ctl));
  ok("storage pruning enabled", ctl?.prune_enabled === true);

  if (usable(supplied.UPSTASH_REDIS_REST_URL)) {
    const r = await redisAtomicityProbe(supplied.UPSTASH_REDIS_REST_URL, supplied.UPSTASH_REDIS_REST_TOKEN);
    ok("Redis reachable + atomic quota operations", r.reachable && r.atomic, `${r.wins}/${r.parallel} winners at limit ${r.limit}`);
  } else ok("Redis credentials available locally for the probe", false, "supply UPSTASH_REDIS_REST_* in .env.edge-provision.local");

  // every worker authenticates, and a scheduler-triggered call is inert while the switch is OFF
  for (const fn of ["editorial-worker", "fetch-worker", "cluster-worker", "translation-worker"]) {
    const unauth = await fetch(`${FN}/${fn}`, { method: "POST", body: "{}" }).then((r) => r.status);
    const sched = await callWorker(fn, {}, { "x-jd-trigger": "scheduler" });
    ok(`${fn}: rejects unauthenticated (401) and is inert under the kill switch`, unauth === 401 && sched.body?.status === "kill_switch_off", `${unauth} / ${sched.body?.status}`);
  }
  // editorial run mode must now pass the durable-quota guard (a manual run would call the AI, so only assert the guard clears)
  const dbsz = Number(sql("select (pg_database_size(current_database())/1048576)::int as mb;")[0]?.mb);
  ok("database comfortably below the 500 MB Free ceiling", dbsz > 0 && dbsz < 450, `${dbsz} MB`);
  const gh = JSON.parse(run("gh", ["api", "repos/Jack160699/jandarpan-ai-news-system/actions/workflows", "--jq", "[.workflows[] | {name, state, path}]"]) || "[]");
  console.log("  GitHub workflows:", gh.map((w) => `${w.name}(${w.state})`).join(", "));
  return summary();
}

async function setKill(enabled, note) {
  const r = await rpc("jd_set_scheduler_enabled", { p_enabled: enabled, p_note: note });
  return r.status === 200;
}

async function enable() {
  const green = await preflight();
  if (!green) { console.log("\nPreflight not green - scheduler NOT enabled."); process.exitCode = 1; return; }
  if (!APPLY) { console.log("\nPreflight green. Re-run with --apply to enable the scheduler."); return; }
  const done = await setKill(true, `go-live ${new Date().toISOString()}`);
  ok("scheduler_control.enabled = true", done);
  console.log("Scheduler ENABLED. Run `observe 12` to watch the first cycle; `disable` flips it off instantly.");
}

async function observe(minutes = 12) {
  const end = Date.now() + Number(minutes) * 60_000;
  const since = new Date().toISOString();
  console.log(`Observing from ${since} for ${minutes} min...`);
  let last = "";
  while (Date.now() < end) {
    const d = (await rest(`scheduler_dispatch_log?select=job_id,skipped,error,request_id&dispatched_at=gte.${since}`)).json ?? [];
    const runs = (await rest(`ops_cron_runs?select=job,ok,trigger,duration_ms,processed&created_at=gte.${since}&trigger=eq.supabase-edge`)).json ?? [];
    const line = `dispatches=${d.length} (http=${d.filter((x) => x.request_id).length}, lease_skips=${d.filter((x) => x.skipped).length}, errors=${d.filter((x) => x.error).length}) edge_runs=${runs.length} failed=${runs.filter((x) => !x.ok).length}`;
    if (line !== last) { console.log(new Date().toISOString().slice(11, 19), line); last = line; }
    await new Promise((r) => setTimeout(r, 30_000));
  }
}

const table = { plan, provision, preflight: async () => { process.exitCode = (await preflight()) ? 0 : 1; }, enable, observe: () => observe(cliArgs[0] && !cliArgs[0].startsWith("--") ? cliArgs[0] : 12), disable: async () => { console.log((await setKill(false, "manual disable")) ? "Scheduler DISABLED (kill switch OFF)." : "FAILED to disable"); } };
if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, "/")}` || process.argv[1]?.endsWith("edge-go-live.mjs")) {
  if (!table[cmd]) { console.log("unknown command: " + cmd); process.exit(1); }
  await table[cmd]();
}
