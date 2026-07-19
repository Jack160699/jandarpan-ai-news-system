import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(__dirname, "../../..");

describe("Phase 4 — shell and editor unification", () => {
  it("editor article route renders inside AdminShell", () => {
    const src = readFileSync(
      join(root, "src/app/admin/editor/[id]/page.tsx"),
      "utf8"
    );
    expect(src).toContain("AdminShell");
    expect(src).toContain("JanDarpanEditorWorkbench");
    expect(src).toContain("hidePageHeader");
  });

  it("does not ship platform-settings.css from admin layout", () => {
    const src = readFileSync(join(root, "src/app/admin/layout.tsx"), "utf8");
    expect(src).not.toContain("platform-settings.css");
    expect(src).toContain("admin-v3.css");
  });

  it("AdminShell keeps Collapse desktop-only and uses tiered more tools", () => {
    const src = readFileSync(
      join(root, "src/components/admin-newsroom/AdminShell.tsx"),
      "utf8"
    );
    expect(src).toContain("moreToolsLabel");
    expect(src).toContain("primaryNavItems");
    expect(src).toContain("secondaryNavItems");
    expect(src).toContain("desktopViewport");
    expect(src).toContain("av3-only-desktop");
    expect(src).toContain("admin-nav-more-tools");
    // Team/Settings/Sign out live in account menu, not workspace nav cards
    expect(src).toContain("secondaryWorkspaces");
    expect(src).toContain("Sign out");
  });

  it("legacy PlatformSettingsDashboard is removed", () => {
    let missing = false;
    try {
      readFileSync(
        join(root, "src/components/admin-newsroom/PlatformSettingsDashboard.tsx"),
        "utf8"
      );
    } catch {
      missing = true;
    }
    expect(missing).toBe(true);
  });
});
