import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  isPausableRecurringPath,
  isRecurringTrafficPaused,
  isVercelCronRequest,
  recurringPauseBody,
  VERCEL_CRON_ONLY,
} from "./recurring-pause";

const hdr = (h: Record<string, string>) => ({ get: (n: string) => h[n.toLowerCase()] ?? null });
const VERCEL_CRON = hdr({ "user-agent": "vercel-cron/1.0" });
const BROWSER = hdr({ "user-agent": "Mozilla/5.0" });
const BEARER = hdr({ "user-agent": "curl/8", authorization: "Bearer secret-value" });

describe("recurring-traffic pause", () => {
  it("is off unless JD_PAUSE_RECURRING is exactly 'true'", () => {
    expect(isRecurringTrafficPaused({})).toBe(false);
    expect(isRecurringTrafficPaused({ JD_PAUSE_RECURRING: "false" })).toBe(false);
    expect(isRecurringTrafficPaused({ JD_PAUSE_RECURRING: "1" })).toBe(false);
    expect(isRecurringTrafficPaused({ JD_PAUSE_RECURRING: " TRUE " })).toBe(true);
  });

  it("pauses every cron route and the ingestion/AI trigger routes", () => {
    for (const p of ["/api/cron", "/api/cron/orchestrate", "/api/cron/editorial-generate", "/api/cron/jobs", "/api/fetch-news", "/api/process-ai", "/api/generate-articles", "/api/process-editorial-images"]) {
      expect(isPausableRecurringPath(p, BROWSER), p).toBe(true);
    }
  });

  it("never pauses the website, auth, human admin use or recovery/health endpoints", () => {
    for (const p of ["/", "/home", "/story/abc", "/admin", "/admin/login", "/api/admin/ops/failures", "/api/health", "/api/health/live", "/api/health/ready", "/api/rss-health", "/api/status/production", "/api/auth/callback", "/api/cronjobs-lookalike"]) {
      expect(isPausableRecurringPath(p, BROWSER), p).toBe(false);
    }
  });

  it("keeps the publish-purge hook alive (it makes no Supabase read) so list pages stay fresh when only the Edge pipeline runs", () => {
    expect(isPausableRecurringPath("/api/cron/revalidate", BROWSER)).toBe(false);
    expect(isPausableRecurringPath("/api/cron/revalidate", VERCEL_CRON)).toBe(false);
  });

  it("pauses the admin routes Vercel Cron calls ONLY for the cron caller, not for a human admin", () => {
    expect(isPausableRecurringPath("/api/admin/audit-branded-images", VERCEL_CRON)).toBe(true);
    expect(isPausableRecurringPath("/api/admin/audit-branded-images", hdr({ "x-vercel-cron": "1" }))).toBe(true);
    expect(isPausableRecurringPath("/api/admin/audit-branded-images", BEARER)).toBe(true); // GitHub / QStash style caller
    expect(isPausableRecurringPath("/api/admin/audit-branded-images", BROWSER)).toBe(false);
    expect(isPausableRecurringPath("/api/admin/audit-branded-images")).toBe(false);
    expect(isVercelCronRequest(VERCEL_CRON)).toBe(true);
    expect(isVercelCronRequest(BROWSER)).toBe(false);
  });

  it("NO ACCIDENTAL CRON TRAFFIC: every path in vercel.json crons is paused when Vercel Cron calls it", () => {
    const cfg = JSON.parse(fs.readFileSync(path.join(__dirname, "../../../vercel.json"), "utf8")) as { crons?: Array<{ path: string }> };
    expect(cfg.crons?.length).toBeGreaterThan(0);
    for (const c of cfg.crons!) {
      expect(isPausableRecurringPath(c.path, VERCEL_CRON), `vercel.json cron ${c.path} would still run while paused`).toBe(true);
    }
    // an admin route that is in vercel.json must be registered as cron-only, never silently ignored
    for (const c of cfg.crons!) if (c.path.startsWith("/api/admin/")) expect(VERCEL_CRON_ONLY.has(c.path)).toBe(true);
  });

  it("NO ACCIDENTAL CRON TRAFFIC: the GitHub workflows that call the site on a schedule are not part of the repo's active automation", () => {
    // Scheduled GitHub workflows are disabled in GitHub (not in git), so assert the inventory instead: every scheduled workflow
    // only calls paused paths -- a new scheduled workflow calling something else must be added here consciously.
    const dir = path.join(__dirname, "../../../.github/workflows");
    const calledPaths = new Set<string>();
    for (const f of fs.readdirSync(dir)) {
      const text = fs.readFileSync(path.join(dir, f), "utf8");
      if (!/cron:/.test(text)) continue;
      for (const m of text.matchAll(/"(\/api\/[a-zA-Z0-9\-_/]+)"/g)) calledPaths.add(m[1]!);
    }
    for (const p of calledPaths) expect(isPausableRecurringPath(p, BEARER), `scheduled workflow calls ${p}`).toBe(true);
  });

  it("answers with a static, secret-free body", () => {
    expect(recurringPauseBody("/api/cron/x")).toMatchObject({ ok: true, paused: true, path: "/api/cron/x" });
  });
});
