import { describe, expect, it } from "vitest";
import { buildAdminMetric, metricFreshnessFromAge } from "@/lib/admin-v3/metric-contract";
import {
  resolveDailySectionAccess,
} from "@/lib/admin-v3/overview-daily-access";
import { canAccessAdminRoute } from "@/lib/newsroom-auth/rbac";
import { roleHasPermission } from "@/lib/saas-auth/rbac";
import { landingPathForRole, workspacesForRole } from "@/lib/admin-platform/workspaces";

/**
 * Contract-level metric reconciliation for Phase 5.
 * Live API values are proven in Playwright; this suite locks the agreement rules.
 */

describe("phase5 metric reconciliation contracts", () => {
  it("published-today metric keeps source/period/freshness and matches scalar value", () => {
    const generatedAt = new Date().toISOString();
    const metric = buildAdminMetric(12, {
      source: "generated_articles.published_at",
      period: "today_local",
      unit: "stories",
      generatedAt,
      ok: true,
      comparison: { value: 10, period: "yesterday", label: "vs yesterday" },
    });
    expect(metric.value).toBe(12);
    expect(metric.source).toBe("generated_articles.published_at");
    expect(metric.period).toBe("today_local");
    expect(metric.generatedAt).toBe(generatedAt);
    expect(["live", "fresh"]).toContain(metric.freshness);
    expect(metric.availability).toBe("available");
    expect(metric.comparison?.period).toBe("yesterday");
  });

  it("does not invent zero for unavailable cost metrics", () => {
    const metric = buildAdminMetric(null, {
      source: "ops.executive",
      period: "today",
      ok: false,
      availability: "unavailable",
    });
    expect(metric.value).toBeNull();
    expect(metric.availability).toBe("unavailable");
    expect(metric.freshness).toBe("unavailable");
  });

  it("stale last-known freshness is not live", () => {
    const old = new Date(Date.now() - 10 * 60_000).toISOString();
    expect(metricFreshnessFromAge(old)).toBe("stale");
  });

  it("editor overview sections withhold costs/platform/incidents", () => {
    const access = resolveDailySectionAccess("editor");
    expect(access.bySection.editorial).toBe(true);
    expect(access.bySection.audience).toBe(true);
    expect(access.bySection.seo).toBe(true);
    expect(access.bySection.costs).toBe(false);
    expect(access.bySection.platform).toBe(false);
    expect(access.bySection.incidents).toBe(false);
    expect(access.withheld).toEqual(
      expect.arrayContaining(["costs", "platform", "incidents"])
    );
  });

  it("moderator (technical) can monitor but not bill", () => {
    expect(roleHasPermission("moderator", "monitoring:read")).toBe(true);
    expect(roleHasPermission("moderator", "billing:read")).toBe(false);
    expect(canAccessAdminRoute("moderator", "/admin/health")).toBe(true);
    expect(canAccessAdminRoute("moderator", "/admin/executive")).toBe(false);
  });

  it("landing paths match role matrix expectations", () => {
    expect(landingPathForRole("super_admin")).toBe("/admin/overview");
    expect(landingPathForRole("moderator")).toBe("/admin/editorial");
    expect(landingPathForRole("editor")).toBe("/admin/stories");
    expect(landingPathForRole("journalist")).toBe("/admin/editorial");
  });

  it("editor workspaces exclude Platform; journalist includes it", () => {
    const editorWs = workspacesForRole("editor").map((w) => w.id);
    const journalistWs = workspacesForRole("journalist").map((w) => w.id);
    expect(editorWs).not.toContain("technical");
    expect(journalistWs).toContain("technical");
    expect(editorWs).not.toContain("team");
  });

  it("documents intentional period differences for SEO vs today KPIs", () => {
    const todaySpend = buildAdminMetric(1.2, {
      source: "ops.executive",
      period: "today",
      unit: "usd",
    });
    const gscImpressions = buildAdminMetric(5000, {
      source: "seo.search_console",
      period: "gsc_rolling_28d",
      unit: "impressions",
    });
    expect(todaySpend.period).not.toBe(gscImpressions.period);
  });
});
