/**
 * Runs the BUILT editorial-worker bundle under a real Deno runtime and exercises the paths that need no network:
 * boot, env bridging (Deno.env -> process.env), auth, request validation, test-mode gating. Placeholder env only -
 * it never talks to Supabase or any AI provider.
 *
 *   pnpm edge:build && node scripts/edge-deno-smoke.mjs [path-to-deno]
 *
 * Deno is located via, in order: argv[2], $DENO_BIN, `deno` on PATH.
 */
import { spawn } from "node:child_process";
import path from "node:path";

const deno = process.argv[2] || process.env.DENO_BIN || "deno";
const entry = path.join(process.cwd(), "supabase/functions/editorial-worker/index.ts");
const port = 8000;
const SECRET = "smoke-test-secret-not-real";

const child = spawn(deno, ["run", "--allow-net", "--allow-env", "--allow-read", entry], {
  // Hermetic: only what Deno needs to start, plus placeholders. No inherited credentials.
  env: {
    PATH: process.env.PATH ?? "",
    SystemRoot: process.env.SystemRoot ?? "",
    TEMP: process.env.TEMP ?? "",
    EDGE_WORKER_SECRET: SECRET,
    SUPABASE_URL: "https://smoke-test.supabase.co",
    SUPABASE_ANON_KEY: "anon-placeholder-key-0000000000",
    SUPABASE_SERVICE_ROLE_KEY: "service-placeholder-key",
    NEWSROOM_GENERATE_ARTICLES: "true",
    // deliberately NOT enabling EDGE_WORKER_TEST_MODE
  },
  stdio: ["ignore", "pipe", "pipe"],
});
let stderr = "";
child.stderr.on("data", (d) => (stderr += d));
child.stdout.on("data", () => {});

const results = [];
const check = (name, ok, detail = "") => results.push({ name, ok, detail });

async function waitUp() {
  for (let i = 0; i < 60; i++) {
    try {
      await fetch(`http://127.0.0.1:${port}/`, { method: "GET" });
      return true;
    } catch {
      await new Promise((r) => setTimeout(r, 250));
    }
  }
  return false;
}

async function call(method, headers = {}, body) {
  const res = await fetch(`http://127.0.0.1:${port}/`, {
    method,
    headers: { "content-type": "application/json", ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let json = null;
  try {
    json = await res.json();
  } catch {}
  return { status: res.status, json };
}

let exitCode = 0;
try {
  const up = await waitUp();
  check("boots under Deno and serves HTTP", up, up ? "" : stderr.slice(0, 400));
  if (up) {
    let r = await call("GET");
    check("GET -> 405", r.status === 405 && r.json?.status === "method_not_allowed", JSON.stringify(r));
    r = await call("POST", {}, {});
    check("no bearer -> 401 unauthorized", r.status === 401 && r.json?.status === "unauthorized", JSON.stringify(r.json));
    r = await call("POST", { authorization: "Bearer wrong-secret" }, {});
    check("wrong bearer -> 401", r.status === 401, String(r.status));
    r = await call("POST", { authorization: `Bearer ${SECRET}` }, { mode: "test", event_id: "0d8a5c0e-1b1f-4e0a-9c55-000000000000" });
    check("test mode disabled by default -> 403", r.status === 403 && r.json?.status === "test_mode_disabled", JSON.stringify(r.json));
    r = await call("POST", { authorization: `Bearer ${SECRET}` }, { event_id: "0d8a5c0e-1b1f-4e0a-9c55-000000000000" });
    check("event_id rejected in run mode -> 400", r.status === 400 && r.json?.status === "bad_request", JSON.stringify(r.json));
    r = await call("POST", { authorization: `Bearer ${SECRET}` }, { mode: "bogus" });
    check("unknown mode -> 400", r.status === 400, String(r.status));
    // No AI provider configured in this smoke env -> handled outcome, exercises AsyncLocalStorage-free early path + logging
    r = await call("POST", { authorization: `Bearer ${SECRET}`, "x-correlation-id": "smoke-corr-1" }, {});
    check(
      "no provider configured -> handled (no_ai_provider), correlation id echoed",
      r.status === 200 && r.json?.status === "no_ai_provider" && r.json?.correlation_id === "smoke-corr-1",
      JSON.stringify({ status: r.status, s: r.json?.status, c: r.json?.correlation_id })
    );
  }
} catch (e) {
  check("smoke run", false, String(e));
} finally {
  const exited = new Promise((resolve) => child.once("exit", resolve));
  child.kill();
  await Promise.race([exited, new Promise((r) => setTimeout(r, 3000))]);
}

for (const r of results) console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.name}${r.ok ? "" : "  -> " + r.detail}`);
if (results.some((r) => !r.ok)) {
  exitCode = 1;
  if (stderr.trim()) console.log("--- deno stderr ---\n" + stderr.slice(0, 1500));
}
process.exitCode = exitCode;
