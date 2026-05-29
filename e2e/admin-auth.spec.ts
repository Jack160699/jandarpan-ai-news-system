import { expect, test } from "@playwright/test";
import {
  clearE2eDeskSession,
  mockSessionApi,
  setE2eDeskSession,
} from "./helpers/auth";

test.describe("Admin auth RBAC", () => {
  test.beforeEach(async ({ page }) => {
    await clearE2eDeskSession(page.request);
  });

  test("super_admin sees Team and can open /admin/team", async ({ page }) => {
    await setE2eDeskSession(page.request, "super_admin");
    await mockSessionApi(page, "super_admin");

    await page.goto("/admin/editorial", { waitUntil: "domcontentloaded" });
    await expect(page.locator(".anr-nav")).toBeVisible({ timeout: 20_000 });
    await expect(page.locator('.anr-nav a[href="/admin/team"]')).toBeVisible({
      timeout: 20_000,
    });

    await page.goto("/admin/team", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/admin\/team/);
    await expect(page.locator("h1")).toContainText(/team/i);
  });

  test("editor does not see Team in sidebar", async ({ page }) => {
    await setE2eDeskSession(page.request, "editor");
    await mockSessionApi(page, "editor");

    await page.goto("/admin/editorial");
    await expect(page.locator(".anr-nav")).toBeVisible();
    await expect(page.getByRole("link", { name: "Team" })).toHaveCount(0);
  });

  test("editor is blocked from /admin/team", async ({ page }) => {
    await setE2eDeskSession(page.request, "editor");
    await mockSessionApi(page, "editor");

    await page.goto("/admin/team");
    await expect(page).not.toHaveURL(/\/admin\/team$/);
  });

  test("missing role cookie triggers session refresh", async ({ page, context }) => {
    await context.addCookies([
      {
        name: "nr-e2e-user",
        value: "e2e-no-role",
        url: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000",
      },
    ]);

    await page.goto("/admin/editorial", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(
      /\/api\/dashboard\/auth\/refresh-session|\/admin\/login/,
      { timeout: 15_000 }
    );
  });

  test("expired desk session redirects to login", async ({ page }) => {
    await page.context().clearCookies();
    await page.goto("/admin/editorial");
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test("logout clears desk cookies", async ({ page }) => {
    await setE2eDeskSession(page.request, "super_admin");
    await mockSessionApi(page, "super_admin");
    await page.goto("/admin/editorial");

    await page.evaluate(async () => {
      await fetch("/api/dashboard/auth/logout", { method: "POST" });
    });

    const cookies = await page.context().cookies();
    const roleCookie = cookies.find((c) => c.name === "nr-dashboard-role");
    expect(roleCookie?.value ?? "").toBe("");
  });
});
