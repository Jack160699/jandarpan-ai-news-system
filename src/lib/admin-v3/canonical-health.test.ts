import { describe, expect, it } from "vitest";
import { deriveCanonicalHealth } from "./canonical-health";

describe("deriveCanonicalHealth", () => {
  it("never reports healthy when a check is unhealthy", () => {
    const snap = deriveCanonicalHealth({
      status: "healthy",
      checks: [
        { id: "a", label: "DB", status: "healthy", latencyMs: 10 },
        { id: "b", label: "Cron", status: "unhealthy", latencyMs: 500, message: "stale" },
      ],
      cron: { jobs: [], staleJobs: [] },
      launchWidgets: [],
    });
    expect(snap.state).toBe("critical");
    expect(snap.label).toContain("Critical");
  });

  it("maps stale cron to degraded", () => {
    const snap = deriveCanonicalHealth({
      status: "healthy",
      checks: [{ id: "a", label: "DB", status: "healthy", latencyMs: 10 }],
      cron: { jobs: [{ job: "fetch-news", ok: true, startedAt: "2026-07-19T00:00:00Z" }], staleJobs: ["revalidate"] },
      launchWidgets: [],
    });
    expect(snap.state).toBe("degraded");
  });

  it("maps failed cron job to critical", () => {
    const snap = deriveCanonicalHealth({
      status: "degraded",
      checks: [],
      cron: {
        jobs: [{ job: "fetch-news", ok: false, startedAt: "2026-07-19T00:00:00Z" }],
        staleJobs: [],
      },
      launchWidgets: [],
    });
    expect(snap.state).toBe("critical");
  });
});
