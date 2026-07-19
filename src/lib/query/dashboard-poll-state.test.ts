import { describe, expect, it } from "vitest";
import {
  isDashboardPollRoute,
  isEditorialDashboardRoute,
} from "@/lib/query/dashboard-poll-state";

describe("isEditorialDashboardRoute", () => {
  it("allows editorial desk routes", () => {
    expect(isEditorialDashboardRoute("/admin/editorial")).toBe(true);
    expect(isEditorialDashboardRoute("/admin/stories")).toBe(true);
    expect(isEditorialDashboardRoute("/admin/articles")).toBe(true);
    expect(isEditorialDashboardRoute("/admin/workflow")).toBe(true);
    expect(isEditorialDashboardRoute("/admin/analytics")).toBe(true);
  });

  it("blocks business, platform, settings, overview, SEO, team", () => {
    expect(isEditorialDashboardRoute("/admin/overview")).toBe(false);
    expect(isEditorialDashboardRoute("/admin/business")).toBe(false);
    expect(isEditorialDashboardRoute("/admin/technical")).toBe(false);
    expect(isEditorialDashboardRoute("/admin/health")).toBe(false);
    expect(isEditorialDashboardRoute("/admin/settings")).toBe(false);
    expect(isEditorialDashboardRoute("/admin/settings/organization")).toBe(false);
    expect(isEditorialDashboardRoute("/admin/seo/search-console")).toBe(false);
    expect(isEditorialDashboardRoute("/admin/seo/autonomous")).toBe(false);
    expect(isEditorialDashboardRoute("/admin/executive")).toBe(false);
    expect(isEditorialDashboardRoute("/admin/team")).toBe(false);
    expect(isEditorialDashboardRoute("/admin/billing")).toBe(false);
  });

  it("blocks immersive editor detail and auth routes", () => {
    expect(isEditorialDashboardRoute("/admin/editor/abc-123")).toBe(false);
    expect(isEditorialDashboardRoute("/admin/login")).toBe(false);
    expect(isEditorialDashboardRoute("/admin/editor")).toBe(true);
  });

  it("keeps poll helper aligned with allowlist", () => {
    expect(isDashboardPollRoute("/admin/business")).toBe(false);
    expect(isDashboardPollRoute("/admin/stories")).toBe(true);
  });
});
