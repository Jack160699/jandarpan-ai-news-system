import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/lib/saas-auth/session", () => ({
  getDashboardSession: vi.fn(),
}));

vi.mock("@/lib/security/admin-access-log", () => ({
  logAdminAccessDenied: vi.fn().mockResolvedValue(undefined),
}));

import { getDashboardSession } from "@/lib/saas-auth/session";
import {
  requireAdminPermission,
  requireAdminSession,
  requireAnyAdminPermission,
  requireSuperAdmin,
  sessionHasPermission,
} from "@/lib/auth/admin-authorization";
import type { DashboardSession } from "@/lib/saas-auth/types";

const mockedGetSession = vi.mocked(getDashboardSession);

function sessionFor(role: string): DashboardSession {
  return {
    userId: "u1",
    email: `${role}@example.com`,
    accessToken: "supabase_cookie",
    isDevBypass: false,
    membership: {
      id: "m1",
      tenantId: "t1",
      tenantSlug: "jan-darpan",
      tenantName: "Jan Darpan",
      userId: "u1",
      email: `${role}@example.com`,
      role: role as DashboardSession["membership"]["role"],
      status: "active",
    },
  };
}

describe("admin-authorization helpers", () => {
  beforeEach(() => {
    mockedGetSession.mockReset();
  });

  it("returns 401 when unauthenticated", async () => {
    mockedGetSession.mockResolvedValue(null);
    const result = await requireAdminSession(new Request("http://localhost/api/admin/x"));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(401);
    }
  });

  it("editor is forbidden from billing:read", async () => {
    mockedGetSession.mockResolvedValue(sessionFor("editor"));
    const result = await requireAdminPermission(
      new Request("http://localhost/api/admin/ops/executive"),
      "billing:read"
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.response.status).toBe(403);
  });

  it("moderator (technical) can read monitoring but not billing", async () => {
    mockedGetSession.mockResolvedValue(sessionFor("moderator"));
    const mon = await requireAdminPermission(
      new Request("http://localhost/api/admin/ops/health-summary"),
      "monitoring:read"
    );
    expect(mon.ok).toBe(true);
    const bill = await requireAdminPermission(
      new Request("http://localhost/api/admin/ops/executive"),
      "billing:read"
    );
    expect(bill.ok).toBe(false);
  });

  it("super admin retains full access", async () => {
    mockedGetSession.mockResolvedValue(sessionFor("super_admin"));
    const result = await requireSuperAdmin(
      new Request("http://localhost/api/admin/team")
    );
    expect(result.ok).toBe(true);
    expect(sessionHasPermission(sessionFor("super_admin"), "billing:read")).toBe(
      true
    );
  });

  it("viewer/journalist cannot satisfy super admin", async () => {
    mockedGetSession.mockResolvedValue(sessionFor("journalist"));
    const result = await requireSuperAdmin(
      new Request("http://localhost/api/admin/schema/health")
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.response.status).toBe(403);
  });

  it("requireAnyAdminPermission allows editor via content:read", async () => {
    mockedGetSession.mockResolvedValue(sessionFor("editor"));
    const result = await requireAnyAdminPermission(
      new Request("http://localhost/api/admin/overview/daily"),
      ["content:read", "billing:read", "monitoring:read"]
    );
    expect(result.ok).toBe(true);
  });

  it("business-like access: analytics without billing withholds costs conceptually", async () => {
    // Canonical "business admin" maps to roles with analytics; only super_admin has billing today.
    mockedGetSession.mockResolvedValue(sessionFor("editor"));
    expect(sessionHasPermission(sessionFor("editor"), "analytics:read")).toBe(true);
    expect(sessionHasPermission(sessionFor("editor"), "billing:read")).toBe(false);
  });
});
