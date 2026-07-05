import { describe, expect, it } from "vitest";
import {
  isAdminDeskPath,
  resolveTenantFromHost,
  shouldWriteWhitelabelTenantCookie,
} from "@/lib/tenant/middleware-routing";

describe("middleware-routing", () => {
  it("treats admin desk paths as isolated from whitelabel bootstrap", () => {
    expect(isAdminDeskPath("/admin/login")).toBe(true);
    expect(isAdminDeskPath("/admin/editorial")).toBe(true);
    expect(isAdminDeskPath("/api/dashboard/auth/session")).toBe(true);
    expect(isAdminDeskPath("/api/dashboard/auth/login")).toBe(true);
    expect(isAdminDeskPath("/login")).toBe(true);
    expect(isAdminDeskPath("/")).toBe(false);
    expect(isAdminDeskPath("/story/foo")).toBe(false);
  });

  it("does not write whitelabel cookie on admin login", () => {
    expect(
      shouldWriteWhitelabelTenantCookie("/admin/login", "localhost")
    ).toBe(false);
    expect(
      shouldWriteWhitelabelTenantCookie("/admin/login", "jandarpan.news")
    ).toBe(false);
  });

  it("writes whitelabel cookie only when hostname resolves", () => {
    expect(shouldWriteWhitelabelTenantCookie("/", "localhost")).toBe(true);
    expect(shouldWriteWhitelabelTenantCookie("/", "unknown.example")).toBe(
      false
    );
  });

  it("resolves localhost to jan-darpan (not legacy cg-bhaskar slug)", () => {
    const tenant = resolveTenantFromHost("localhost");
    expect(tenant?.slug).toBe("jan-darpan-chhattisgarh");
  });
});
