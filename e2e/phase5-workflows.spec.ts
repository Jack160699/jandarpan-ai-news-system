import { expect, test } from "@playwright/test";
import { authenticateAs, clearE2eDeskSession } from "./helpers/auth";

test.describe("Phase 5 workflows", () => {
  test.beforeEach(async ({ page, context }) => {
    await clearE2eDeskSession(page.request);
    await context.clearCookies();
  });

  test("super admin routes", async ({ page }) => {
    await authenticateAs(page, "super_admin");
    for (const r of [
      "/admin/overview",
      "/admin/business",
      "/admin/technical",
      "/admin/team",
      "/admin/settings",
    ]) {
      await page.goto(r, { waitUntil: "domcontentloaded" });
      await expect(page).toHaveURL(new RegExp(r.replace(/\//g, "\\/")));
    }
    await page.goto("/admin/overview", { waitUntil: "domcontentloaded" });
    await expect(page.locator(".av3-sidebar__user")).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.locator(".av3-workspace")).toBeVisible();
  });

  test("editor desk + tech deny", async ({ page }) => {
    await authenticateAs(page, "editor");
    await page.goto("/admin/editorial", { waitUntil: "domcontentloaded" });
    await expect(
      page.getByRole("heading", { name: /Editorial/i }).first()
    ).toBeVisible({ timeout: 30_000 });
    await page.goto("/admin/stories", { waitUntil: "domcontentloaded" });
    await page.goto("/admin/editor", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: /^Editor$/i })).toBeVisible({
      timeout: 30_000,
    });
    await page.goto("/admin/technical", { waitUntil: "domcontentloaded" });
    await expect(page).not.toHaveURL(/\/admin\/technical$/);
  });

  test("moderator platform no billing", async ({ page }) => {
    await authenticateAs(page, "moderator");
    await page.goto("/admin/technical", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/admin\/technical/);
    expect((await page.request.get("/api/admin/ops/executive")).status()).toBe(
      403
    );
    await authenticateAs(page, "super_admin");
    await page.goto("/admin/executive", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/admin\/executive/);
  });
});
