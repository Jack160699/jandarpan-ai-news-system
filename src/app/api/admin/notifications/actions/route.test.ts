import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";

vi.mock("@/lib/saas-auth/guard", () => ({
  requireDashboardSession: vi.fn(),
}));

vi.mock("@/lib/security/admin-access-log", () => ({
  logAdminAccessDenied: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/admin-v3/incident-feed", () => ({
  acknowledgeIncident: vi.fn(() => true),
}));

import { requireDashboardSession } from "@/lib/saas-auth/guard";
import { acknowledgeIncident } from "@/lib/admin-v3/incident-feed";
import { POST } from "./route";

const mockedGuard = vi.mocked(requireDashboardSession);
const mockedAck = vi.mocked(acknowledgeIncident);

function session(role: string) {
  return {
    ok: true as const,
    session: {
      userId: "u1",
      email: "a@b.com",
      accessToken: "x",
      isDevBypass: false,
      membership: {
        id: "m1",
        tenantId: "t1",
        tenantSlug: "jan-darpan",
        tenantName: "Jan Darpan",
        userId: "u1",
        email: "a@b.com",
        role: role as "editor",
        status: "active" as const,
      },
    },
  };
}

describe("notification actions permissions", () => {
  beforeEach(() => {
    mockedGuard.mockReset();
    mockedAck.mockClear();
  });

  it("rejects unauthenticated", async () => {
    mockedGuard.mockResolvedValue({
      ok: false,
      response: NextResponse.json({ ok: false }, { status: 401 }),
    });
    const res = await POST(
      new Request("http://localhost/api/admin/notifications/actions", {
        method: "POST",
        body: JSON.stringify({ action: "acknowledge", id: "x" }),
      })
    );
    expect(res.status).toBe(401);
  });

  it("editor without monitoring cannot acknowledge ops incidents", async () => {
    mockedGuard.mockResolvedValue(session("editor"));
    const res = await POST(
      new Request("http://localhost/api/admin/notifications/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "acknowledge", id: "queue-backlog" }),
      })
    );
    expect(res.status).toBe(403);
    expect(mockedAck).not.toHaveBeenCalled();
  });

  it("moderator with monitoring can acknowledge", async () => {
    mockedGuard.mockResolvedValue(session("moderator"));
    const res = await POST(
      new Request("http://localhost/api/admin/notifications/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "acknowledge", id: "queue-backlog" }),
      })
    );
    expect(res.status).toBe(200);
    expect(mockedAck).toHaveBeenCalledWith("queue-backlog");
  });
});
