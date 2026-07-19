import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildIncidentIdentity,
  deriveCanonicalHealth,
  incidentNotificationKey,
} from "@/lib/admin-v3/canonical-health";
import {
  acknowledgeIncident,
  buildIncidentFeed,
  resetIncidentFeedStateForTests,
} from "@/lib/admin-v3/incident-feed";
import {
  ADMIN_POLL,
  isDocumentHidden,
  nextBackoffMs,
  notificationsIntervalForTone,
  statusIntervalForState,
  withJitter,
} from "@/lib/admin-v3/admin-poll";
import {
  getCanonicalHealth,
  resetCanonicalHealthCacheForTests,
} from "@/lib/admin-v3/canonical-health-service";

vi.mock("@/lib/admin-v3/health-summary", () => ({
  buildHealthSummary: vi.fn(async () => ({
    ok: true,
    mode: "summary" as const,
    status: "healthy",
    snapshot: {
      state: "healthy" as const,
      label: "Production · Healthy",
      reasons: [],
      checkedAt: new Date().toISOString(),
      criticalCount: 0,
      warningCount: 0,
      topIncidents: [],
    },
    checks: [
      {
        id: "supabase",
        label: "Supabase",
        status: "healthy",
        latencyMs: 10,
      },
    ],
    metrics: { memoryUsageMb: 1, uptimeSec: 1, queues: { aiPending: 0 } },
    cron: { jobs: [], staleJobs: [] },
    sources: [{ source: "supabase", ok: true, ms: 10 }],
    failedSources: [],
    totalMs: 12,
    checkedAt: new Date().toISOString(),
    stale: false,
  })),
}));

vi.mock("@/lib/observability", () => ({
  getOpsErrorSummary: vi.fn(async () => ({ recent24h: 0 })),
  getRecentOpsErrors: vi.fn(async () => []),
}));

describe("Phase 2 canonical health rules", () => {
  it("does not escalate optional unconfigured redis/openai to critical", () => {
    const snap = deriveCanonicalHealth({
      status: "degraded",
      checks: [
        { id: "supabase", label: "Supabase", status: "healthy", latencyMs: 5 },
        {
          id: "redis",
          label: "Upstash Redis",
          status: "degraded",
          message: "redis_not_configured",
        },
        {
          id: "openai",
          label: "AI providers",
          status: "degraded",
          message: "No AI providers configured",
        },
      ],
      cron: { jobs: [], staleJobs: [] },
      launchWidgets: [],
    });
    expect(snap.state).not.toBe("critical");
    expect(snap.reasons.every((r) => !r.id.includes("redis"))).toBe(true);
  });

  it("maps probe timeouts to warning, not false outage critical", () => {
    const snap = deriveCanonicalHealth({
      status: "unknown",
      checks: [
        {
          id: "queues",
          label: "Queues",
          status: "unknown",
          message: "queues_timeout_1200ms",
        },
      ],
      cron: { jobs: [], staleJobs: [] },
      launchWidgets: [],
    });
    expect(snap.state).toBe("warning");
    expect(snap.reasons[0]?.severity).toBe("warning");
  });

  it("never reports healthy when a critical incident is active", () => {
    const snap = deriveCanonicalHealth({
      status: "healthy",
      checks: [
        {
          id: "supabase",
          label: "Supabase",
          status: "unhealthy",
          message: "connection refused",
        },
      ],
      cron: { jobs: [], staleJobs: [] },
      launchWidgets: [],
    });
    expect(snap.state).toBe("critical");
    expect(snap.criticalCount).toBeGreaterThan(0);
  });

  it("dedupes multiple cron failures into one family", () => {
    const snap = deriveCanonicalHealth({
      status: "degraded",
      checks: [],
      cron: {
        jobs: [
          { job: "fetch-news", ok: false, startedAt: "t1" },
          { job: "orchestrate", ok: false, startedAt: "t2" },
          { job: "cleanup", ok: false, startedAt: "t3" },
        ],
        staleJobs: ["fetch-news", "orchestrate"],
      },
      launchWidgets: [],
    });
    const cronReasons = snap.reasons.filter(
      (r) =>
        r.incidentFamily === "cron-execution" ||
        r.id === "incident-cron-execution" ||
        r.id.startsWith("cron-fail-")
    );
    expect(cronReasons.length).toBe(1);
  });

  it("groups GNews 429 signals under one notification key", () => {
    const a = {
      id: "err-1",
      severity: "warning" as const,
      title: "GNews 429",
      detail: "gnews rate limit 429",
      href: "/admin/health",
    };
    const b = {
      id: "err-2",
      severity: "warning" as const,
      title: "GNews again",
      detail: "GNews returned 429 Too Many Requests",
      href: "/admin/health",
    };
    expect(incidentNotificationKey(a)).toBe(incidentNotificationKey(b));
    expect(incidentNotificationKey(a)).toBe("provider-quota:gnews");
  });

  it("builds stable incident identities", () => {
    expect(
      buildIncidentIdentity({
        subsystem: "ingestion",
        family: "provider-quota",
        provider: "gnews",
      })
    ).toBe("ingestion:provider-quota:-:gnews");
  });
});

describe("canonical health service cache", () => {
  beforeEach(() => {
    resetCanonicalHealthCacheForTests();
  });

  it("serves cached result within TTL", async () => {
    const a = await getCanonicalHealth();
    const b = await getCanonicalHealth();
    expect(a.snapshot.state).toBe("healthy");
    expect(b.fromCache).toBe(true);
  });
});

describe("incident feed", () => {
  beforeEach(() => {
    resetIncidentFeedStateForTests();
    resetCanonicalHealthCacheForTests();
  });

  it("builds lightweight feed from canonical health", async () => {
    const feed = await buildIncidentFeed();
    expect(feed.ok).toBe(true);
    expect(feed.timing.totalMs).toBeGreaterThanOrEqual(0);
    expect(feed.canonical.state).toBeDefined();
  });

  it("acknowledge persists for feed items", () => {
    expect(acknowledgeIncident("queue-backlog")).toBe(true);
  });
});

describe("admin poll policy", () => {
  it("uses hotter intervals for critical state", () => {
    expect(statusIntervalForState("critical")).toBeLessThanOrEqual(
      ADMIN_POLL.statusIntervalHotMs * (1 + ADMIN_POLL.jitterRatio) + 1
    );
  });

  it("backs off after errors", () => {
    expect(nextBackoffMs(1)).toBeGreaterThanOrEqual(
      ADMIN_POLL.errorBackoffInitialMs * 0.5
    );
    expect(nextBackoffMs(5)).toBeLessThanOrEqual(
      ADMIN_POLL.errorBackoffMaxMs * 1.2
    );
  });

  it("applies jitter", () => {
    const samples = Array.from({ length: 5 }, () => withJitter(1000, 0.1));
    expect(samples.every((n) => n >= 900 && n <= 1100)).toBe(true);
  });

  it("maps notification tone to interval", () => {
    expect(notificationsIntervalForTone("critical")).toBeLessThan(
      ADMIN_POLL.notificationsIntervalMs * 1.2
    );
  });

  it("documents hidden-tab helper", () => {
    expect(typeof isDocumentHidden()).toBe("boolean");
  });
});
