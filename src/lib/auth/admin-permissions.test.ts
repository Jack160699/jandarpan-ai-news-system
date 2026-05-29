import { describe, expect, it } from "vitest";
import {
  canManageTeam,
  hasPermission,
  hasResolvedRole,
  isSuperAdmin,
} from "@/lib/auth/admin-permissions";

describe("admin-permissions", () => {
  it("hasResolvedRole requires authReady and role", () => {
    expect(hasResolvedRole({ authReady: false, role: "super_admin" })).toBe(false);
    expect(hasResolvedRole({ authReady: true, role: "" })).toBe(false);
    expect(hasResolvedRole({ authReady: true, role: "super_admin" })).toBe(true);
  });

  it("isSuperAdmin only for super_admin", () => {
    expect(isSuperAdmin("super_admin")).toBe(true);
    expect(isSuperAdmin("editor")).toBe(false);
    expect(isSuperAdmin("")).toBe(false);
  });

  it("canManageTeam requires resolved super_admin", () => {
    expect(
      canManageTeam({ authReady: true, role: "super_admin", permissions: ["team:read"] })
    ).toBe(true);
    expect(
      canManageTeam({ authReady: true, role: "editor", permissions: ["team:read"] })
    ).toBe(false);
    expect(canManageTeam({ authReady: false, role: "super_admin" })).toBe(false);
  });

  it("hasPermission denies when role unresolved", () => {
    expect(
      hasPermission({ authReady: false, role: "editor" }, "content:read")
    ).toBe(false);
    expect(
      hasPermission({ authReady: true, role: "editor" }, "editorial:write")
    ).toBe(true);
  });
});
