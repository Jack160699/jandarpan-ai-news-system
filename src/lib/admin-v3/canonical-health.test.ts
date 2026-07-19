import { describe, expect, it } from "vitest";
import {
  deriveCanonicalHealth,
  loginStatusFromCanonical,
  loginStatusLabel,
} from "./canonical-health";

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

  it("collapses stale cron signals into one incident", () => {
    const snap = deriveCanonicalHealth({
      status: "healthy",
      checks: [
        { id: "a", label: "DB", status: "healthy", latencyMs: 10 },
        {
          id: "cron_workers",
          label: "Cron workers",
          status: "degraded",
          message: "2 stale jobs",
        },
      ],
      cron: {
        jobs: [{ job: "fetch-news", ok: true, startedAt: "2026-07-19T00:00:00Z" }],
        staleJobs: ["revalidate", "cluster"],
      },
      launchWidgets: [
        {
          id: "cron",
          label: "Cron health",
          status: "degraded",
          detail: "2 stale cron jobs",
        },
      ],
    });

    expect(snap.state).toBe("degraded");
    expect(snap.reasons).toHaveLength(1);
    expect(snap.reasons[0]?.id).toBe("incident-cron-execution");
    expect(snap.reasons[0]?.title).toBe("Cron execution degraded");
    expect(snap.reasons[0]?.detail).toContain("revalidate");
    expect(snap.reasons[0]?.detail).toContain("cluster");
    expect(
      snap.reasons.some((r) => r.title === "Stale cron jobs" || r.title === "Cron health")
    ).toBe(false);
  });

  it("maps three or more stale cron jobs to critical in the collapsed incident", () => {
    const snap = deriveCanonicalHealth({
      status: "healthy",
      checks: [],
      cron: {
        jobs: [],
        staleJobs: ["a", "b", "c"],
      },
      launchWidgets: [],
    });
    expect(snap.state).toBe("critical");
    expect(snap.reasons).toHaveLength(1);
    expect(snap.reasons[0]?.severity).toBe("critical");
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
    expect(snap.reasons.some((r) => r.id.startsWith("cron-fail-"))).toBe(true);
  });

  it("exposes severity counts and top incidents", () => {
    const snap = deriveCanonicalHealth({
      status: "degraded",
      checks: [
        { id: "db", label: "Database", status: "degraded", message: "slow" },
      ],
      cron: { jobs: [], staleJobs: ["fetch-news"] },
      launchWidgets: [],
    });
    expect(snap.criticalCount).toBe(0);
    expect(snap.warningCount).toBeGreaterThan(0);
    expect(snap.topIncidents?.length).toBeGreaterThan(0);
  });
});

describe("login status labels", () => {
  it("maps canonical states to production login labels", () => {
    expect(loginStatusLabel("healthy")).toBe("Production healthy");
    expect(loginStatusLabel("degraded")).toBe("Production degraded");
    expect(loginStatusLabel("critical")).toBe("Production incident detected");
    expect(loginStatusLabel("unknown")).toBe("Status unavailable");
  });

  it("returns unavailable when probe is not reachable", () => {
    expect(loginStatusFromCanonical("healthy", false)).toBe("Status unavailable");
    expect(loginStatusFromCanonical("critical", true)).toBe(
      "Production incident detected"
    );
  });

  it("maps reachable unknown state to status unavailable label", () => {
    expect(loginStatusFromCanonical("unknown", true)).toBe("Status unavailable");
  });
});
