import { beforeEach, describe, expect, it, vi } from "vitest";

const cookieGet = vi.fn();

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    get: cookieGet,
  })),
}));

vi.mock("@/lib/tenant/registry", () => ({
  getDefaultTenant: () => ({
    id: "t1",
    slug: "jan-darpan",
    branding: { nameEn: "Jan Darpan" },
  }),
}));

vi.mock("@/lib/auth/session-refresh", async () => {
  const actual = await vi.importActual<typeof import("@/lib/auth/session-refresh")>(
    "@/lib/auth/session-refresh"
  );
  return {
    ...actual,
    isE2eAuthEnabled: vi.fn(() => true),
  };
});

import { resolveE2eDashboardSession } from "@/lib/auth/e2e-dashboard-session";
import { isE2eAuthEnabled } from "@/lib/auth/session-refresh";

describe("resolveE2eDashboardSession", () => {
  beforeEach(() => {
    cookieGet.mockReset();
    vi.mocked(isE2eAuthEnabled).mockReturnValue(true);
  });

  it("returns null when e2e auth disabled", async () => {
    vi.mocked(isE2eAuthEnabled).mockReturnValue(false);
    await expect(resolveE2eDashboardSession()).resolves.toBeNull();
  });

  it("builds a session from e2e + role cookies", async () => {
    cookieGet.mockImplementation((name: string) => {
      if (name === "nr-e2e-user") return { value: "e2e-editor" };
      if (name === "nr-dashboard-role") return { value: "editor" };
      return undefined;
    });
    const session = await resolveE2eDashboardSession();
    expect(session?.userId).toBe("e2e-editor");
    expect(session?.membership.role).toBe("editor");
    expect(session?.isDevBypass).toBe(true);
  });

  it("normalizes viewer to journalist", async () => {
    cookieGet.mockImplementation((name: string) => {
      if (name === "nr-e2e-user") return { value: "e2e-viewer" };
      if (name === "nr-dashboard-role") return { value: "viewer" };
      return undefined;
    });
    const session = await resolveE2eDashboardSession();
    expect(session?.membership.role).toBe("journalist");
  });
});
