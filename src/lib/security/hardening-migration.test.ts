import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = path.resolve(__dirname, "../../..");
const SQL = fs.readFileSync(path.join(ROOT, "supabase/migrations/20261007030000_102_security_hardening.sql"), "utf8");

function walk(dir: string, out: string[] = []): string[] {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    if (fs.statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(name) && !/\.test\./.test(name)) out.push(p);
  }
  return out;
}

const SERVER_ONLY_RPCS = ["sweep_stale_ai_queue", "add_story_comment", "toggle_story_like", "record_story_play", "record_story_consumption", "get_user_consumption_batch", "get_stories_engagement"];

describe("security hardening migration 102", () => {
  it("revokes anon/authenticated execute on every server-only RPC and keeps service_role", () => {
    for (const fn of SERVER_ONLY_RPCS) expect(SQL, fn).toContain(`public.${fn}(`);
    expect(SQL).toMatch(/revoke all on function %s from public, anon, authenticated/);
    expect(SQL).toMatch(/grant execute on function %s to service_role/);
  });

  it("drops the wide-open write policies and leaves the public forms alone", () => {
    for (const p of ["story_likes_manage_public", "story_views_log_insert_public", "user_story_consumption_insert_public", "user_story_consumption_update_public", "story_comments_insert_public"]) {
      expect(SQL).toContain(`drop policy if exists ${p}`);
    }
    expect(SQL).toMatch(/not in \('compliance_grievances', 'stratxcel_contact_messages'\)/);
  });

  it("is idempotent (no bare create/drop that fails on re-run)", () => {
    expect(SQL).not.toMatch(/^\s*drop (policy|table|function)\s+(?!if exists)/im);
  });

  it("is safe for the app: every caller of a revoked RPC uses the service-role client in the same file", () => {
    const files = walk(path.join(ROOT, "src")).filter((f) => SERVER_ONLY_RPCS.some((fn) => fs.readFileSync(f, "utf8").includes(`rpc("${fn}"`)));
    expect(files.length).toBeGreaterThanOrEqual(3);
    for (const f of files) {
      const src = fs.readFileSync(f, "utf8");
      expect(src, path.relative(ROOT, f)).toMatch(/createAdminServerClient/);
      expect(src, path.relative(ROOT, f)).not.toMatch(/createBrowserClient|createClientComponentClient/);
    }
  });
});
