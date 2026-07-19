import { describe, expect, it } from "vitest";
import {
  landingPathForRole,
  resolveWorkspaceFromPath,
  workspaceAccessible,
  workspacesForRole,
} from "./workspaces";
import { resolveAdminLanding, isSafeAdminNext } from "./role-landing";

describe("admin workspaces", () => {
  it("lands super_admin on command centre", () => {
    expect(landingPathForRole("super_admin")).toBe("/admin/overview");
  });

  it("lands editor on story queue", () => {
    expect(landingPathForRole("editor")).toBe("/admin/stories");
  });

  it("hides team workspace from editors", () => {
    const workspaces = workspacesForRole("editor");
    expect(workspaces.some((w) => w.id === "team")).toBe(false);
    expect(workspaces.some((w) => w.id === "editorial")).toBe(true);
  });

  it("shows platform workspace to journalists with monitoring", () => {
    expect(
      workspaceAccessible(
        {
          id: "technical",
          label: "Platform",
          description: "",
          homeHref: "/admin/technical",
          permission: "monitoring:read",
          primary: true,
          items: [],
        },
        "journalist"
      )
    ).toBe(true);
  });

  it("labels technical workspace as Platform", () => {
    const platform = workspacesForRole("super_admin").find((w) => w.id === "technical");
    expect(platform?.label).toBe("Platform");
    expect(platform?.primary).toBe(true);
  });

  it("resolves workspace from path", () => {
    expect(resolveWorkspaceFromPath("/admin/seo/rankings")).toBe("business");
    expect(resolveWorkspaceFromPath("/admin/ingestion")).toBe("technical");
    expect(resolveWorkspaceFromPath("/admin/stories")).toBe("editorial");
  });

  it("honours safe next param on landing", () => {
    expect(resolveAdminLanding("super_admin", "/admin/team")).toBe("/admin/team");
    expect(resolveAdminLanding("super_admin", "https://evil.com")).toBe("/admin/overview");
    expect(isSafeAdminNext("/admin/login")).toBe(false);
  });
});
