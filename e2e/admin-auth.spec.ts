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

  test("super_admin can open Team workspace and /admin/team", async ({ page }) => {
    await setE2eDeskSession(page.request, "super_admin");
    await mockSessionApi(page, "super_admin");

    await page.goto("/admin/overview", { waitUntil: "domcontentloaded" });
    await expect(page.locator(".anr-workspace-switcher")).toBeVisible({
      timeout: 20_000,
    });
    await page.locator(".anr-workspace-switcher__trigger").click();
    await expect(
      page.locator('.anr-workspace-switcher__item[href="/admin/team"]')
    ).toBeVisible({ timeout: 10_000 });

    await page.goto("/admin/team", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/admin\/team/);
    await expect(page.locator("h1")).toContainText(/team/i);
  });

  test("editor does not see Team workspace", async ({ page }) => {
    await setE2eDeskSession(page.request, "editor");
    await mockSessionApi(page, "editor");

    await page.goto("/admin/editorial");
    await expect(page.locator(".anr-nav")).toBeVisible();
    await expect(
      page.locator('.anr-workspace-switcher__item[href="/admin/team"]')
    ).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Team & access" })).toHaveCount(0);
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

  test("login page exposes forgot password and show password", async ({ page }) => {
    await page.goto("/admin/login");
    await expect(page.getByRole("heading", { name: /jandarpan/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /forgot password/i })).toBeVisible();
    await page.getByLabel("Password").fill("secret-password");
    await page.getByLabel(/show password/i).click();
    await expect(page.getByLabel("Password")).toHaveAttribute("type", "text");
  });
});
