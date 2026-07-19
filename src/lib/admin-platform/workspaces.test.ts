import { describe, expect, it } from "vitest";
import {
  ADMIN_WORKSPACES,
  landingPathForRole,
  moreToolsLabel,
  primaryNavItems,
  resolveWorkspaceFromPath,
  secondaryNavItems,
  secondaryWorkspacesForRole,
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

  it("keeps Team and Settings as secondary (account menu only)", () => {
    const secondary = secondaryWorkspacesForRole("super_admin");
    expect(secondary.map((w) => w.id).sort()).toEqual(["settings", "team"]);
    expect(ADMIN_WORKSPACES.filter((w) => w.primary).map((w) => w.id)).toEqual([
      "overview",
      "editorial",
      "business",
      "technical",
    ]);
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
    expect(resolveWorkspaceFromPath("/admin/executive")).toBe("business");
    expect(resolveWorkspaceFromPath("/admin/ingestion")).toBe("technical");
    expect(resolveWorkspaceFromPath("/admin/stories")).toBe("editorial");
    expect(resolveWorkspaceFromPath("/admin/editor/abc")).toBe("editorial");
  });

  it("uses queue-first editorial primary routes", () => {
    const editorial = ADMIN_WORKSPACES.find((w) => w.id === "editorial")!;
    const primary = primaryNavItems(editorial.items).map((i) => i.href);
    const secondary = secondaryNavItems(editorial.items).map((i) => i.href);
    expect(primary).toEqual([
      "/admin/editorial",
      "/admin/stories",
      "/admin/articles",
      "/admin/editor",
      "/admin/live-wire",
    ]);
    expect(secondary).toContain("/admin/workflow");
    expect(secondary).toContain("/admin/sources");
    expect(moreToolsLabel("editorial")).toBe("More Editorial Tools");
  });

  it("keeps business and platform primaries short", () => {
    const business = ADMIN_WORKSPACES.find((w) => w.id === "business")!;
    const platform = ADMIN_WORKSPACES.find((w) => w.id === "technical")!;
    expect(primaryNavItems(business.items)).toHaveLength(4);
    expect(primaryNavItems(platform.items)).toHaveLength(5);
    expect(secondaryNavItems(business.items).map((i) => i.href)).toContain(
      "/admin/billing"
    );
  });

  it("honours safe next param on landing", () => {
    expect(resolveAdminLanding("super_admin", "/admin/team")).toBe("/admin/team");
    expect(resolveAdminLanding("super_admin", "https://evil.com")).toBe(
      "/admin/overview"
    );
    expect(isSafeAdminNext("/admin/login")).toBe(false);
  });
});
