import { describe, expect, it } from "vitest";
import { isPausableRecurringPath, isRecurringTrafficPaused, recurringPauseBody } from "./recurring-pause";

describe("recurring-traffic pause", () => {
  it("is off unless JD_PAUSE_RECURRING is exactly 'true'", () => {
    expect(isRecurringTrafficPaused({})).toBe(false);
    expect(isRecurringTrafficPaused({ JD_PAUSE_RECURRING: "false" })).toBe(false);
    expect(isRecurringTrafficPaused({ JD_PAUSE_RECURRING: "1" })).toBe(false);
    expect(isRecurringTrafficPaused({ JD_PAUSE_RECURRING: " TRUE " })).toBe(true);
  });

  it("pauses every cron route and the ingestion/AI trigger routes", () => {
    for (const p of ["/api/cron", "/api/cron/orchestrate", "/api/cron/editorial-generate", "/api/fetch-news", "/api/process-ai", "/api/generate-articles", "/api/process-editorial-images"]) {
      expect(isPausableRecurringPath(p), p).toBe(true);
    }
  });

  it("never pauses the website, auth, admin or recovery/health endpoints", () => {
    for (const p of ["/", "/home", "/story/abc", "/admin", "/admin/login", "/api/admin/ops/failures", "/api/admin/audit-branded-images", "/api/health", "/api/health/live", "/api/health/ready", "/api/rss-health", "/api/status/production", "/api/auth/callback", "/api/cronjobs-lookalike"]) {
      expect(isPausableRecurringPath(p), p).toBe(false);
    }
  });

  it("answers with a static, secret-free body", () => {
    expect(recurringPauseBody("/api/cron/x")).toMatchObject({ ok: true, paused: true, path: "/api/cron/x" });
  });
});
