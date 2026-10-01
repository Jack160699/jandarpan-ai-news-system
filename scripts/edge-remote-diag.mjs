/**
 * One diagnostic call to a DEPLOYED Edge worker with console capture, using TEMPORARY secrets that are always unset.
 *
 *   node scripts/edge-remote-diag.mjs <function> '<json body>' [--env .env.production.local]
 *   e.g. node scripts/edge-remote-diag.mjs fetch-worker '{"shard":3,"shards":12}'
 *
 * Prints status, duration, the worker's result summary and a timeline of the captured console lines. Secret values are
 * never printed. The scheduler is never touched.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";

const [fn, bodyArg = "{}"] = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const envFile = process.argv.includes("--env") ? process.argv[process.argv.indexOf("--env") + 1] : ".env.production.local";
if (!fn) throw new Error("usage: edge-remote-diag.mjs <function> '<json body>'");
const REF = fs.readFileSync("supabase/.temp/project-ref", "utf8").trim();
const npx = process.platform === "win32" ? "npx.cmd" : "npx";
const sb = (args, opts = {}) => execFileSync(npx, ["--no-install", "supabase", ...args], { encoding: "utf8", shell: process.platform === "win32", ...opts });

const fileEnv = {};
for (const line of fs.readFileSync(envFile, "utf8").split(/\r?\n/)) {
  const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
  if (m) fileEnv[m[1]] = m[2].replace(/^["']|["']$/g, "").trim();
}
const usable = (v) => Boolean(v) && v !== "[SENSITIVE]" && v.length >= 8;
const SECRET = crypto.randomBytes(24).toString("hex");
const TEMP = {
  EDGE_WORKER_SECRET: SECRET,
  EDGE_WORKER_TEST_MODE: "true",
  NEWSROOM_CLUSTER_EVENTS: "true",
  NEWSROOM_USE_EMBEDDINGS: "true",
  NEWSROOM_GENERATE_ARTICLES: "true",
  NEWSROOM_LEGACY_BRIDGE: "false", // signals only: no news_articles copy, no dead-end news_ai_queue rows
  ...(usable(fileEnv.CLOUDFLARE_ACCOUNT_ID) ? { CLOUDFLARE_ACCOUNT_ID: fileEnv.CLOUDFLARE_ACCOUNT_ID } : {}),
  ...(usable(fileEnv.CLOUDFLARE_API_TOKEN) ? { CLOUDFLARE_API_TOKEN: fileEnv.CLOUDFLARE_API_TOKEN } : {}),
};
const NAMES = Object.keys(TEMP);

const f = path.join(os.tmpdir(), `.edge-d-${crypto.randomBytes(6).toString("hex")}.env`);
try {
  fs.writeFileSync(f, Object.entries(TEMP).map(([k, v]) => `${k}=${v}`).join("\n") + "\n", { mode: 0o600 });
  sb(["secrets", "set", "--env-file", f, "--project-ref", REF], { stdio: ["ignore", "pipe", "pipe"] });
} finally {
  try { fs.rmSync(f, { force: true }); } catch { /* ignore */ }
}
try {
  const url = `https://${REF}.supabase.co/functions/v1/${fn}`;
  for (let i = 0; i < 30; i++) {
    const r = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
    if (r.status !== 503) break;
    await new Promise((r2) => setTimeout(r2, 2000));
  }
  const t0 = Date.now();
  const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${SECRET}` }, body: JSON.stringify({ ...JSON.parse(bodyArg), include_logs: true }) });
  const json = await res.json().catch(() => null);
  console.log(`HTTP ${res.status} in ${Date.now() - t0} ms  status=${json?.status} reason=${json?.reason ?? ""}  sb-request-id=${res.headers.get("sb-request-id")}`);
  console.log("result:", JSON.stringify(json?.result ?? {}).slice(0, 1200));
  console.log("resources:", JSON.stringify(json?.resources ?? {}));
  const logs = json?.debug_logs ?? [];
  console.log(`--- ${logs.length} console lines (secret-scanned below) ---`);
  for (const l of logs.slice(0, 80)) console.log("  " + l.slice(0, 230));
  const leaked = [SECRET, fileEnv.CLOUDFLARE_API_TOKEN].filter(usable).filter((n) => JSON.stringify(json).includes(n));
  console.log(`secret scan: ${leaked.length === 0 ? "clean" : "LEAK DETECTED"}`);
} finally {
  try { sb(["secrets", "unset", ...NAMES, "--project-ref", REF], { stdio: ["ignore", "pipe", "pipe"] }); } catch (e) { console.log("WARNING: unset failed:", String(e?.message ?? e).slice(0, 160)); }
  const j = JSON.parse(sb(["secrets", "list", "--project-ref", REF, "-o", "json"]).replace(/^[^\[{]*/, ""));
  const names = (Array.isArray(j) ? j : j.secrets ?? []).map((s) => s.name);
  console.log("temporary secrets remaining:", NAMES.filter((n) => names.includes(n)).join(",") || "none");
}
