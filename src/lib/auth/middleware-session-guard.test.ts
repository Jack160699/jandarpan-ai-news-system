import { describe, expect, it } from "vitest";
import { evaluateSessionGuard } from "@/lib/auth/middleware-session-guard";

function mockRequest(url: string, cookies: Record<string, string> = {}) {
  const parsed = new URL(url);
  return {
    nextUrl: parsed,
    cookies: {
      get: (name: string) => {
        const value = cookies[name];
        return value ? { value } : undefined;
      },
    },
  } as never;
}

describe("evaluateSessionGuard", () => {
  it("continues when unauthenticated", () => {
    const result = evaluateSessionGuard({
      request: mockRequest("http://localhost/admin/team"),
      pathname: "/admin/team",
      hasAuth: false,
    });
    expect(result.action).toBe("continue");
  });

  it("redirects to refresh when role cookie missing on admin route", () => {
    const result = evaluateSessionGuard({
      request: mockRequest("http://localhost/admin/team"),
      pathname: "/admin/team",
      hasAuth: true,
      userId: "u1",
      tenantCookie: "jan-darpan",
    });
    expect(result.action).toBe("refresh");
    if (result.action === "refresh") {
      expect(result.redirectTo).toContain("/api/dashboard/auth/refresh-session");
      expect(result.redirectTo).toContain("attempt=2");
    }
  });

  it("forces login after max refresh attempts", () => {
    const result = evaluateSessionGuard({
      request: mockRequest("http://localhost/admin/team?attempt=3"),
      pathname: "/admin/team",
      hasAuth: true,
      userId: "u1",
    });
    expect(result.action).toBe("login");
  });

  it("exempts refresh-session path", () => {
    const result = evaluateSessionGuard({
      request: mockRequest("http://localhost/api/dashboard/auth/refresh-session"),
      pathname: "/api/dashboard/auth/refresh-session",
      hasAuth: true,
      userId: "u1",
    });
    expect(result.action).toBe("continue");
  });
});
