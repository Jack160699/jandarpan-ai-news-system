import { describe, expect, it } from "vitest";
import { mapDashboardToAdminSession } from "@/lib/auth/map-admin-session";
import type { DashboardSession } from "@/lib/saas-auth/types";

const baseSession: DashboardSession = {
  userId: "user-1",
  email: "admin@example.com",
  accessToken: "token",
  isDevBypass: false,
  membership: {
    id: "m-1",
    tenantId: "t-1",
    tenantSlug: "jan-darpan",
    tenantName: "Jan Darpan",
    userId: "user-1",
    email: "admin@example.com",
    role: "super_admin",
    status: "active",
  },
};

describe("mapDashboardToAdminSession", () => {
  it("maps membership and team permissions for super_admin", () => {
    const mapped = mapDashboardToAdminSession(baseSession);
    expect(mapped).not.toBeNull();
    expect(mapped!.membership!.role).toBe("super_admin");
    expect(mapped!.permissions).toContain("team:read");
    expect(mapped!.permissions).toContain("team:write");
  });

  it("returns null when membership role missing (no silent editor fallback)", () => {
    const mapped = mapDashboardToAdminSession({
      ...baseSession,
      membership: {
        ...baseSession.membership,
        role: "   " as (typeof baseSession.membership)["role"],
      },
    });
    expect(mapped).toBeNull();
  });
});
