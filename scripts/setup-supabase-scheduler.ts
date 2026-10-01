/**
 * One-time operator script: provision the secrets the Supabase pg_cron scheduler needs.
 *
 *   pnpm exec tsx scripts/setup-supabase-scheduler.ts            # PLAN: prints exactly what it would do
 *   pnpm exec tsx scripts/setup-supabase-scheduler.ts --apply    # does it
 *
 * What it does (all idempotent / re-runnable):
 *   1. generates a fresh random scheduler secret (never printed, never written to disk)
 *   2. stores it on Vercel (production) as CRON_SCHEDULER_SECRET — a dedicated, revocable credential
 *      accepted for ingest/pipeline/ops routes but NEVER for admin routes
 *   3. stores the same secret + the app base URL in Supabase Vault (jd_cron_secret, jd_app_base_url)
 *
 * Prerequisites: migrations 081–088 applied; `vercel` CLI logged in + linked; `supabase` CLI logged in + linked.
 * After --apply, REDEPLOY production so the new env var is live, then run the verification queries in
 * docs/SUPABASE_SCHEDULER.md. Rotate later by re-running with --apply --rotate.
 */

import { execFileSync, spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const args = new Set(process.argv.slice(2));
const APPLY = args.has("--apply");
const baseUrlArg = process.argv.find((a) => a.startsWith("--base-url="))?.slice(11);
const BASE_URL = (baseUrlArg ?? process.env.APP_BASE_URL ?? "https://www.jandarpan.news").replace(/\/+$/, "");

function plan() {
  console.log(`
PLAN
  1. generate a 48-byte random secret (kept in memory only)
  2. vercel env add CRON_SCHEDULER_SECRET production --sensitive   (value piped via stdin)
  3. supabase vault: upsert 'jd_cron_secret' and 'jd_app_base_url' = ${BASE_URL}
  4. you: redeploy production, then verify (docs/SUPABASE_SCHEDULER.md)
Re-run with --apply to execute.`);
}

if (!APPLY) {
  plan();
  process.exit(0);
}

const secret = randomBytes(48).toString("base64url");

// 1. Vercel
console.log("→ Setting CRON_SCHEDULER_SECRET on Vercel (production)…");
const rm = spawnSync("vercel", ["env", "rm", "CRON_SCHEDULER_SECRET", "production", "--yes"], { shell: process.platform === "win32", stdio: "ignore" });
void rm; // fine if it did not exist
const add = spawnSync("vercel", ["env", "add", "CRON_SCHEDULER_SECRET", "production", "--sensitive"], {
  input: secret,
  shell: process.platform === "win32",
  encoding: "utf8",
});
if (add.status !== 0) {
  console.error("vercel env add failed:", add.stderr?.toString().split("\n")[0] ?? "unknown");
  process.exit(1);
}

// 2. Supabase Vault (secret goes through a temp file that is deleted immediately)
console.log("→ Writing Supabase Vault secrets…");
const sql = `
do $$
declare v_id uuid;
begin
  select id into v_id from vault.secrets where name = 'jd_cron_secret';
  if v_id is null then perform vault.create_secret('${secret}', 'jd_cron_secret', 'pg_cron scheduler bearer credential');
  else perform vault.update_secret(v_id, '${secret}', 'jd_cron_secret', 'pg_cron scheduler bearer credential'); end if;

  select id into v_id from vault.secrets where name = 'jd_app_base_url';
  if v_id is null then perform vault.create_secret('${BASE_URL}', 'jd_app_base_url', 'production base URL');
  else perform vault.update_secret(v_id, '${BASE_URL}', 'jd_app_base_url', 'production base URL'); end if;
end $$;
select name, length(decrypted_secret) as chars from vault.decrypted_secrets where name in ('jd_cron_secret','jd_app_base_url') order by name;
`;
const tmp = path.join(process.env.TEMP ?? ".", `sched-${randomBytes(6).toString("hex")}.sql`);
fs.writeFileSync(tmp, sql, { mode: 0o600 });
try {
  const out = execFileSync("npx", ["--no-install", "supabase", "db", "query", "--linked", "-f", tmp, "-o", "json"], {
    encoding: "utf8",
    shell: process.platform === "win32",
    stdio: ["ignore", "pipe", "inherit"],
  });
  console.log(out.slice(out.indexOf("{"), out.indexOf("{") + 400));
} finally {
  fs.rmSync(tmp, { force: true });
}

console.log(`
Done. Next:
  • REDEPLOY production so CRON_SCHEDULER_SECRET is live.
  • Verify (docs/SUPABASE_SCHEDULER.md): select * from public.scheduler_dispatch_summary(1);
  • After ~30 minutes of healthy runs, the GitHub Actions schedules can be retired.
`);
