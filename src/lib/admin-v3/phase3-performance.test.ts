import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  isEditorialDashboardRoute,
  isDocumentHidden as dashboardHidden,
} from "@/lib/query/dashboard-poll-state";
import {
  ADMIN_POLL,
  isDocumentHidden,
  statusIntervalForState,
} from "@/lib/admin-v3/admin-poll";
import {
  ADMIN_FETCH_DEFAULTS,
  shouldSkipBackgroundFetch,
} from "@/lib/admin-v3/admin-fetch";
import { assembleDailyPayload } from "@/lib/admin-v3/overview-daily";
import { resolveDailySectionAccess } from "@/lib/admin-v3/overview-daily-access";

const root = join(__dirname, "../../..");

describe("Phase 3 — route request gating", () => {
  it("Business and Settings routes do not enable editorial dashboard", () => {
    expect(isEditorialDashboardRoute("/admin/business")).toBe(false);
    expect(isEditorialDashboardRoute("/admin/settings")).toBe(false);
    expect(isEditorialDashboardRoute("/admin/settings/organization")).toBe(false);
  });

  it("sidebar state is not part of the allowlist (path-only gating)", () => {
    // Collapsing/opening the shell cannot change pathname → no refetch gate flip.
    expect(isEditorialDashboardRoute("/admin/business")).toBe(false);
    expect(isEditorialDashboardRoute("/admin/business?sidebar=open")).toBe(false);
  });

  it("Technical home source never calls heavy ops/health on mount", () => {
    const src = readFileSync(
      join(root, "src/sections/admin/PlatformOverviewDashboard.tsx"),
      "utf8"
    );
    expect(src).toContain('"/api/admin/ops/health-summary"');
    expect(src).toContain('"/api/admin/ops/health"');
    // Diagnostics load is gated behind disclosure handler, not mount effect.
    expect(src).toMatch(/useEffect\(\(\) => \{\s*void loadSummary\(\);/);
    expect(src).not.toMatch(/useEffect\(\(\) => \{\s*void loadDiagnostics/);
    expect(src).toContain("onOpenChange");
  });

  it("Health page loads summary first; diagnostics only on demand", () => {
    const src = readFileSync(
      join(root, "src/sections/admin/HealthOperationsPanel.tsx"),
      "utf8"
    );
    expect(src).toContain("/api/admin/ops/health-summary");
    expect(src).toContain("/api/admin/ops/health");
    expect(src).toMatch(/useEffect\(\(\) => \{\s*void loadSummary\(true\)/);
    expect(src).not.toMatch(/useEffect\(\(\) => \{\s*void loadDiagnostics/);
    expect(src).toMatch(/onOpenChange[\s\S]*loadDiagnostics/);
  });
});

describe("Phase 3 — overview partial payload", () => {
  it("returns ok payload when one source times out", () => {
    const access = resolveDailySectionAccess("super_admin");
    const payload = assembleDailyPayload({
      access,
      generatedAt: "2026-07-19T12:00:00.000Z",
      wallStart: Date.now() - 800,
      period: "today",
      editorialR: {
        source: "editorial",
        ok: true,
        ms: 40,
        data: {
          publishedToday: 4,
          publishedYesterday: 3,
          awaitingReview: 1,
          failedStories: 0,
          queuePending: 2,
          latestPublished: null,
        },
      },
      healthR: {
        source: "platform",
        ok: false,
        ms: 1500,
        error: "platform_timeout",
      },
      execR: {
        source: "costs",
        ok: true,
        ms: 20,
        data: { overview: { todaySpend: { display: "₹12", inr: 12 } } },
      },
      gscR: { source: "seo", ok: false, ms: 1500, error: "seo_timeout" },
      analyticsR: {
        source: "audience",
        ok: true,
        ms: 30,
        data: { overview: { visitors: 10, pageViews: 20 } },
      },
    });

    expect(payload.ok).toBe(true);
    expect(payload.editorial).toBeDefined();
    expect(payload.costs).toBeDefined();
    expect((payload.availability as Record<string, boolean>).platform).toBe(
      false
    );
    expect((payload.availability as Record<string, boolean>).editorial).toBe(
      true
    );
    const sources = payload.sources as Array<{ source: string; ok: boolean }>;
    expect(sources.some((s) => s.source === "platform" && !s.ok)).toBe(true);
    expect(String(payload.briefing)).toMatch(/did not finish|not available/i);
  });
});

describe("Phase 3 — fetch / poll standard", () => {
  it("uses bounded summary and diagnostics timeouts", () => {
    expect(ADMIN_FETCH_DEFAULTS.summaryTimeoutMs).toBe(4_000);
    expect(ADMIN_FETCH_DEFAULTS.diagnosticsTimeoutMs).toBe(12_000);
    expect(ADMIN_FETCH_DEFAULTS.timeoutMs).toBe(8_000);
  });

  it("hidden tab pauses background polling helpers", () => {
    const original = globalThis.document;
    Object.defineProperty(globalThis, "document", {
      configurable: true,
      value: { visibilityState: "hidden", hidden: true },
    });
    expect(isDocumentHidden()).toBe(true);
    expect(dashboardHidden()).toBe(true);
    expect(shouldSkipBackgroundFetch()).toBe(true);
    Object.defineProperty(globalThis, "document", {
      configurable: true,
      value: original,
    });
  });

  it("hot status interval is shorter than quiet interval", () => {
    const quiet = statusIntervalForState("healthy");
    const hot = statusIntervalForState("critical");
    expect(hot).toBeLessThanOrEqual(
      ADMIN_POLL.statusIntervalHotMs * (1 + ADMIN_POLL.jitterRatio) + 1
    );
    expect(quiet).toBeGreaterThanOrEqual(
      ADMIN_POLL.statusIntervalMs * (1 - ADMIN_POLL.jitterRatio) - 1
    );
  });
});

describe("Phase 3 — health page progressive contract", () => {
  it("health-summary uses per-source timed probes (no page-level blank timeout)", () => {
    const src = readFileSync(
      join(root, "src/lib/admin-v3/health-summary.ts"),
      "utf8"
    );
    expect(src).toContain("timedSource");
    expect(src).toContain("Promise.all");
    expect(src).toMatch(/timeout|budget/i);
  });

  it("overview daily uses allSettled so one reject cannot blank payload", () => {
    const src = readFileSync(
      join(root, "src/lib/admin-v3/overview-daily.ts"),
      "utf8"
    );
    expect(src).toContain("Promise.allSettled");
    expect(src).toContain("timed(");
  });
});
