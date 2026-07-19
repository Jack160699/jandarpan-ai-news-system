import { expect, test } from "@playwright/test";
import {
  authenticateAs,
  clearE2eDeskSession,
  type E2eDeskRole,
} from "./helpers/auth";

const rows: Array<{
  name: string;
  role: E2eDeskRole;
  land: RegExp;
  deny: string[];
}> = [
  {
    name: "super admin",
    role: "super_admin",
    land: /\/admin\/overview/,
    deny: [],
  },
  {
    name: "technical/EIC",
    role: "moderator",
    land: /\/admin\/editorial/,
    deny: ["/admin/team", "/admin/executive"],
  },
  {
    name: "editor",
    role: "editor",
    land: /\/admin\/stories/,
    deny: ["/admin/team", "/admin/technical", "/admin/executive"],
  },
  {
    name: "reporter",
    role: "journalist",
    land: /\/admin\/editorial/,
    deny: ["/admin/team", "/admin/executive"],
  },
  {
    name: "viewer",
    role: "viewer",
    land: /\/admin\/editorial/,
    deny: ["/admin/team"],
  },
];

test.describe("Phase 5 role matrix", () => {
  for (const p of rows) {
    test(p.name, async ({ page, context }) => {
      await clearE2eDeskSession(page.request);
      await context.clearCookies();
      await authenticateAs(page, p.role);
      await page.goto("/admin", { waitUntil: "domcontentloaded" });
      await expect(page).toHaveURL(p.land, { timeout: 20_000 });
      for (const d of p.deny) {
        await page.goto(d, { waitUntil: "domcontentloaded" });
        await expect(page).not.toHaveURL(
          new RegExp(`${d.replace(/\//g, "\\/")}$`)
        );
      }
    });
  }

  test("business_admin has no distinct role — billing super_admin only", async ({
    page,
    context,
  }) => {
    await clearE2eDeskSession(page.request);
    await context.clearCookies();
    await authenticateAs(page, "moderator");
    expect(
      (await page.request.get("/api/admin/ops/executive")).status()
    ).toBe(403);
    await authenticateAs(page, "super_admin");
    const status = (await page.request.get("/api/admin/ops/executive")).status();
    expect([200, 503]).toContain(status);
  });
});
