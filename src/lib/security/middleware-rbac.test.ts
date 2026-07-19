import { describe, expect, it } from "vitest";
import {
  checkPathRbac,
  middlewareMayAuthorizeFromRoleCookie,
} from "@/lib/security/middleware-rbac";
import { canAccessAdminRoute } from "@/lib/newsroom-auth/rbac";

describe("middleware RBAC policy", () => {
  it("forbids authorizing from role cookie in middleware", () => {
    expect(middlewareMayAuthorizeFromRoleCookie()).toBe(false);
  });

  it("forged super_admin cookie role must not be treated as trusted auth", () => {
    // Simulated attack: client sets role cookie to super_admin while membership is editor.
    // Middleware must not use that cookie for path RBAC (policy flag).
    // Server checkPathRbac with trusted membership role still denies schema.
    expect(middlewareMayAuthorizeFromRoleCookie()).toBe(false);
    expect(canAccessAdminRoute("editor", "/admin/schema")).toBe(false);
    expect(canAccessAdminRoute("editor", "/admin/team")).toBe(false);
    expect(checkPathRbac("/admin/schema", "editor").allowed).toBe(false);
  });

  it("editor cannot access schema/database pages (trusted role)", () => {
    const result = checkPathRbac("/admin/schema", "editor");
    expect(result.allowed).toBe(false);
    expect(result.redirectTo).toContain("forbidden");
  });

  it("moderator (technical) cannot access billing/executive without billing:read", () => {
    expect(canAccessAdminRoute("moderator", "/admin/executive")).toBe(false);
    expect(canAccessAdminRoute("moderator", "/admin/billing")).toBe(false);
    expect(checkPathRbac("/admin/executive", "moderator").allowed).toBe(false);
  });

  it("journalist cannot access team or schema", () => {
    expect(canAccessAdminRoute("journalist", "/admin/team")).toBe(false);
    expect(canAccessAdminRoute("journalist", "/admin/schema")).toBe(false);
  });

  it("super admin retains full sensitive route access", () => {
    expect(canAccessAdminRoute("super_admin", "/admin/schema")).toBe(true);
    expect(canAccessAdminRoute("super_admin", "/admin/team")).toBe(true);
    expect(canAccessAdminRoute("super_admin", "/admin/executive")).toBe(true);
    expect(checkPathRbac("/admin/schema", "super_admin").allowed).toBe(true);
  });

  it("editor can access editorial routes", () => {
    expect(canAccessAdminRoute("editor", "/admin/stories")).toBe(true);
    expect(checkPathRbac("/admin/stories", "editor").allowed).toBe(true);
  });
});
