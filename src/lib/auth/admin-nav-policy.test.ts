import { describe, expect, it } from "vitest";
import { filterAdminNavItems, isAdminNavItemVisible } from "@/lib/auth/admin-nav-policy";

const NAV = [
  { href: "/admin/editorial", label: "Overview" },
  { href: "/admin/team", label: "Team" },
  { href: "/admin/billing", label: "Billing" },
] as const;

describe("admin-nav-policy", () => {
  it("hides Team until role is resolved", () => {
    expect(
      isAdminNavItemVisible("/admin/team", { authReady: false, role: "super_admin" })
    ).toBe(false);
    expect(
      isAdminNavItemVisible("/admin/team", { authReady: true, role: "" })
    ).toBe(false);
  });

  it("shows Team for super_admin when resolved", () => {
    expect(
      isAdminNavItemVisible("/admin/team", {
        authReady: true,
        role: "super_admin",
        permissions: ["team:read"],
      })
    ).toBe(true);
  });

  it("never shows Team for editor even when resolved", () => {
    expect(
      isAdminNavItemVisible("/admin/team", {
        authReady: true,
        role: "editor",
        permissions: ["editorial:write"],
      })
    ).toBe(false);
  });

  it("does not downgrade super_admin to hidden Team during loading", () => {
    const loading = filterAdminNavItems(NAV, { authReady: false, role: "super_admin" });
    expect(loading.some((i) => i.href === "/admin/team")).toBe(false);
    expect(loading.some((i) => i.href === "/admin/editorial")).toBe(true);

    const ready = filterAdminNavItems(NAV, {
      authReady: true,
      role: "super_admin",
      permissions: ["team:read", "billing:read"],
    });
    expect(ready.some((i) => i.href === "/admin/team")).toBe(true);
  });
});
