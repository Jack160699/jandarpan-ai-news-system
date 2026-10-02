import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * PAUSED-SCHEDULER CONTRACT (static): while scheduler_control.enabled = false, the two functions every pg_cron job goes through must
 * return BEFORE reading a secret or making any network call. This is what makes "scheduler OFF" mean "zero recurring traffic".
 */
const dir = path.join(__dirname, "../../../supabase/migrations");
const files = fs.readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();

function latestDefinition(fn: string): string {
  let body = "";
  for (const f of files) {
    const text = fs.readFileSync(path.join(dir, f), "utf8");
    const marker = `create or replace function public.${fn}(`;
    let from = 0;
    for (;;) {
      const i = text.indexOf(marker, from);
      if (i < 0) break;
      const open = text.indexOf("as $$", i);
      const close = open < 0 ? -1 : text.indexOf("$$;", open + 5);
      if (close < 0) break;
      const def = text.slice(i, close + 3);
      if (/p_lease_key|net.http/i.test(def)) body = def; // the full definition, not the thin 4-arg wrapper
      from = close + 3;
    }
  }
  return body;
}

describe("scheduler OFF => no recurring traffic", () => {
  for (const fn of ["jd_invoke_edge", "jd_invoke_cron"]) {
    it(`${fn}: the kill-switch return comes before any secret read or net.http_* call`, () => {
      const def = latestDefinition(fn);
      expect(def.length).toBeGreaterThan(200);
      const kill = def.search(/if not public\.jd_scheduler_enabled\(\) then\s+return null;/i);
      const secret = def.search(/vault\.decrypted_secrets/i);
      const http = def.search(/net\.http_(get|post)/i);
      expect(kill).toBeGreaterThan(-1);
      expect(secret).toBeGreaterThan(kill);
      expect(http).toBeGreaterThan(kill);
    });
  }

  it("the scheduler defaults to OFF in the schema that created the switch", () => {
    const text = files.map((f) => fs.readFileSync(path.join(dir, f), "utf8")).join("\n");
    expect(text).toMatch(/scheduler_control[\s\S]{0,400}enabled\s+boolean\s+not null\s+default\s+false/i);
  });
});
