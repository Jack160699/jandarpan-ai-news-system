import { expect, test } from "@playwright/test";
import {
  authenticateAs,
  clearE2eDeskSession,
  mockSessionApi,
  setE2eDeskSession,
  syncDeskCookiesToBrowser,
} from "./helpers/auth";

test.describe("Admin auth RBAC", () => {
  test.beforeEach(async ({ page, context }) => {
    await clearE2eDeskSession(page.request);
    await context.clearCookies();
  });

  test("super_admin can open Team from account menu and /admin/team", async ({
    page,
  }) => {
    await authenticateAs(page, "super_admin");

    await page.goto("/admin/overview", { waitUntil: "domcontentloaded" });
    await expect(page.locator(".av3-workspace")).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.locator(".av3-sidebar__user")).toBeVisible({
      timeout: 20_000,
    });

    await page.goto("/admin/team", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/admin\/team/);
    await expect(page.locator("h1")).toContainText(/team/i);
  });

  test("editor does not see Team in account menu", async ({ page }) => {
    await authenticateAs(page, "editor");

    await page.goto("/admin/editorial");
    await expect(page.locator(".av3-nav")).toBeVisible({ timeout: 20_000 });
    await page.locator(".av3-sidebar__user").click();
    await expect(page.getByRole("link", { name: "Team" })).toHaveCount(0);
  });

  test("editor is blocked from /admin/team", async ({ page }) => {
    await authenticateAs(page, "editor");

    await page.goto("/admin/team");
    await expect(page).not.toHaveURL(/\/admin\/team$/);
  });

  test("missing role cookie triggers session refresh", async ({
    page,
    context,
  }) => {
    await context.addCookies([
      {
        name: "nr-e2e-user",
        value: "e2e-no-role",
        url: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000",
      },
    ]);

    await page.goto("/admin/editorial", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/admin\/login/, { timeout: 15_000 });
  });

  test("expired desk session redirects to login", async ({ page }) => {
    await page.context().clearCookies();
    await page.goto("/admin/editorial");
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test("logout clears desk cookies", async ({ page }) => {
    await authenticateAs(page, "super_admin");
    await page.goto("/admin/editorial");

    await page.evaluate(async () => {
      await fetch("/api/dashboard/auth/logout", { method: "POST" });
    });

    const cookies = await page.context().cookies();
    const roleCookie = cookies.find((c) => c.name === "nr-dashboard-role");
    const e2eCookie = cookies.find((c) => c.name === "nr-e2e-user");
    expect(roleCookie?.value ?? "").toBe("");
    expect(e2eCookie?.value ?? "").toBe("");
  });

  test("login page uses Jan Darpan brand and show password", async ({
    page,
    context,
  }) => {
    await context.clearCookies();
    await page.goto("/admin/login");
    await expect(page.getByRole("heading", { name: /sign in/i })).toBeVisible();
    await expect(page.getByRole("img", { name: /jan darpan/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /forgot password/i })).toBeVisible();
    await page.locator("#admin-password").fill("secret-password");
    await page.getByLabel(/show password/i).click();
    await expect(page.locator("#admin-password")).toHaveAttribute("type", "text");
  });

  test("collapsed sidebar keeps nav icons", async ({ page }) => {
    await setE2eDeskSession(page.request, "super_admin");
    await syncDeskCookiesToBrowser(page.request, page.context());
    await mockSessionApi(page, "super_admin");
    await page.goto("/admin/overview", { waitUntil: "domcontentloaded" });
    await expect(page.locator(".av3-nav-link").first()).toBeVisible({
      timeout: 20_000,
    });
    const collapse = page.getByLabel(/collapse sidebar/i);
    await expect(collapse).toBeVisible({ timeout: 10_000 });
    await collapse.click();
    await expect(page.getByLabel(/expand sidebar/i)).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.locator(".av3-nav-link svg").first()).toBeVisible();
  });
});
