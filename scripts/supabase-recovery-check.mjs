/**
 * ONE Supabase REST health probe for the post-402 recovery check. Never loops, never retries.
 *
 *   node scripts/supabase-recovery-check.mjs            one probe (refused if a probe ran within the last 6 hours)
 *   node scripts/supabase-recovery-check.mjs --force    override the 6-hour guard (deliberate, explicit recovery check only)
 *
 * It reads one row's id through the public REST API with the anon key (the same path the website uses) and prints only the HTTP
 * status. It does NOT enable the scheduler and does not change anything: on HTTP 200 it prints the exact next steps.
 * The last-probe time is kept in .supabase-recovery-probe.json (git-ignored) so repeated runs cannot hammer a restricted API.
 */
import fs from "node:fs";

const FORCE = process.argv.includes("--force");
const LOCK = ".supabase-recovery-probe.json";
const MIN_INTERVAL_MS = 6 * 3_600_000;

function readEnv(file) {
  try {
    return Object.fromEntries(
      fs.readFileSync(file, "utf8").split(/\r?\n/).map((l) => l.match(/^([A-Z0-9_]+)=(.*)$/)).filter(Boolean).map((m) => [m[1], m[2].trim().replace(/^"|"$/g, "")])
    );
  } catch {
    return {};
  }
}

const env = { ...readEnv(".env.local"), ...readEnv(".env.production.local") };
const url = (env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/$/, "");
const anon = env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
if (!url || !anon) {
  console.log("No NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local or .env.production.local. Nothing was probed.");
  process.exit(3);
}

let last = null;
try {
  last = JSON.parse(fs.readFileSync(LOCK, "utf8"));
} catch {
  /* first probe */
}
if (last && !FORCE && Date.now() - Date.parse(last.at) < MIN_INTERVAL_MS) {
  console.log(`Refusing to probe again: the last probe was ${last.at} (HTTP ${last.status}). Wait 6 h, or pass --force for a deliberate recovery check.`);
  process.exit(4);
}

let status = 0;
let note = "";
try {
  const res = await fetch(`${url}/rest/v1/news_events?select=id&limit=1`, {
    headers: { apikey: anon, authorization: `Bearer ${anon}` },
    signal: AbortSignal.timeout(15_000),
  });
  status = res.status;
  if (status !== 200) {
    const body = await res.text();
    note = /exceed_egress_quota/.test(body) ? "exceed_egress_quota (still restricted)" : body.slice(0, 120);
  }
} catch (e) {
  note = `network error: ${String(e?.message ?? e).slice(0, 80)}`;
}

fs.writeFileSync(LOCK, JSON.stringify({ at: new Date().toISOString(), status, note }));
console.log(`HTTP ${status}${note ? ` - ${note}` : ""}`);

if (status === 200) {
  console.log(`
REST is healthy. Recovery procedure (run in order; stop at the first failure):
  1. node scripts/edge-go-live.mjs preflight        # real-runtime checks: Edge workers, Redis atomicity, CodeCraft, DB headroom
  2. unset JD_PAUSE_RECURRING on Vercel and redeploy # only if you want the daily Vercel crons back
  3. gh workflow enable <id> is NOT needed: the legacy GitHub schedules stay retired
  4. node scripts/edge-go-live.mjs enable --apply    # only after preflight is fully green
  5. node scripts/edge-go-live.mjs observe 12        # watch the first scheduler cycles
See docs/jandarpan-egress-budget.md for what to verify at each step.`);
  process.exit(0);
}
console.log("Still restricted or unreachable. Scheduler stays OFF. Do not probe again until the billing cycle resets.");
process.exit(2);
